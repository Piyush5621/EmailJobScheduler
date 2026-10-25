import { redisClient } from "../config/redis.js";

export interface RateLimitResult {
    allowed: boolean;
    currentCount: number;
    limit: number;
    retryAfterMs: number;
    nextWindowStart: Date;
}

export function getHourlyWindow(date: Date = new Date()): {
    windowKey: string;
    nextWindowStart: Date;
    remainingMs: number;
} {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hour = String(date.getUTCHours()).padStart(2, "0");
    const windowKey = `${year}${month}${day}${hour}`;

    const nextWindowStart = new Date(date);
    nextWindowStart.setUTCMinutes(0, 0, 0);
    nextWindowStart.setUTCHours(nextWindowStart.getUTCHours() + 1);

    const remainingMs = Math.max(0, nextWindowStart.getTime() - date.getTime());

    return { windowKey, nextWindowStart, remainingMs };
}

export async function checkAndIncrementHourlyLimit(
    userId: number,
    campaignId: number,
    hourlyLimit: number | null
): Promise<RateLimitResult> {
    const defaultLimit = Math.max(1, Number(process.env.DEFAULT_HOURLY_LIMIT) || 100);
    const effectiveLimit = hourlyLimit && hourlyLimit > 0 ? hourlyLimit : defaultLimit;

    const { windowKey, nextWindowStart, remainingMs } = getHourlyWindow();
    const redisKey = `rate_limit:user:${userId}:hour:${windowKey}`;

    const luaScript = `
        local current = tonumber(redis.call('get', KEYS[1]) or '0')
        local limit = tonumber(ARGV[1])
        if current >= limit then
            return {0, current}
        else
            local count = redis.call('incr', KEYS[1])
            if count == 1 then
                redis.call('expire', KEYS[1], 7200)
            end
            return {1, count}
        end
    `;

    const res = (await redisClient.eval(luaScript, {
        keys: [redisKey],
        arguments: [effectiveLimit.toString()],
    })) as [number, number];

    const allowed = res[0] === 1;
    const currentCount = res[1];

    return {
        allowed,
        currentCount,
        limit: effectiveLimit,
        retryAfterMs: remainingMs,
        nextWindowStart,
    };
}
