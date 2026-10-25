import nodemailer from "nodemailer";
import { Worker, DelayedError } from "bullmq";
import { emailTransporter } from "../config/email.js";
import { redisClient } from "../config/redis.js";
import {
    getEmailDetailsById,
    claimEmailForSending,
    updateEmailStatus,
    resetEmailForRetry,
    rescheduleEmail,
} from "../repositories/email.repository.js";
import { checkAndIncrementHourlyLimit } from "../services/rate-limiter.service.js";
import { sendRateLimitNotification } from "../services/slack.service.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const parsedRedisUrl = new URL(redisUrl);

const workerConcurrency = Math.max(1, Number(process.env.WORKER_CONCURRENCY) || 5);
const minSendDelayMs = Math.max(0, Number(process.env.MIN_SEND_DELAY_MS) || 2000);

async function reserveSendSlot(minDelayMs: number): Promise<void> {
    if (minDelayMs <= 0) return;

    const now = Date.now();
    const luaScript = `
        local now = tonumber(ARGV[1])
        local minDelay = tonumber(ARGV[2])
        local nextSlot = tonumber(redis.call('get', KEYS[1]) or '0')
        if nextSlot < now then
            nextSlot = now
        end
        local assignedSlot = nextSlot
        redis.call('set', KEYS[1], tostring(assignedSlot + minDelay), 'PX', 60000)
        return assignedSlot
    `;

    const assignedSlot = Number(
        await redisClient.eval(luaScript, {
            keys: ["email_scheduler:next_send_slot"],
            arguments: [now.toString(), minDelayMs.toString()],
        })
    );

    const waitMs = Math.max(0, assignedSlot - now);
    if (waitMs > 0) {
        console.log(`Enforcing minimum send delay: waiting ${waitMs}ms before dispatching email...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
}

export const emailWorker = new Worker(
    "email-scheduler",
    async (job) => {
        if (job.name !== "send-email") {
            throw new Error(`Unsupported job type: ${job.name}`);
        }

        const { emailId } = job.data as { emailId: number };

        const email = await getEmailDetailsById(emailId);

        if (!email) {
            throw new Error(`Email record ${emailId} was not found.`);
        }

        if (email.status === "sent") {
            console.log(`Email ${emailId} is already sent. Skipping.`);
            return;
        }

        if (email.status !== "scheduled") {
            console.warn(
                `Email ${emailId} has status "${email.status}". Skipping to avoid a duplicate send.`
            );
            return;
        }

        // Check shared Redis hourly rate limit before claiming
        const rateLimit = await checkAndIncrementHourlyLimit(
            email.user_id,
            email.campaign_id,
            email.hourly_limit
        );

        if (!rateLimit.allowed) {
            console.warn(
                `Hourly rate limit reached (${rateLimit.currentCount}/${rateLimit.limit}) for sender ${email.user_id}. Rescheduling email ${emailId} for next window in ${Math.round(rateLimit.retryAfterMs / 1000)}s...`
            );

            sendRateLimitNotification(email.user_id, {
                campaignId: email.campaign_id,
                subject: email.subject,
                limit: rateLimit.limit,
                currentCount: rateLimit.currentCount,
                nextWindowStart: rateLimit.nextWindowStart,
            }).catch((err) => {
                console.error("Slack rate-limit notification error:", err);
            });

            await rescheduleEmail(emailId, rateLimit.nextWindowStart);
            await job.moveToDelayed(rateLimit.nextWindowStart.getTime(), job.token);
            throw new DelayedError();
        }

        const claimed = await claimEmailForSending(emailId);

        if (!claimed) {
            console.log(`Email ${emailId} could not be claimed. Skipping.`);
            return;
        }

        let emailSent = false;

        try {
            await reserveSendSlot(minSendDelayMs);

            const info = await emailTransporter.sendMail({
                from: process.env.SMTP_USER,
                to: email.recipient_email,
                subject: email.subject,
                text: email.body,
            });

            emailSent = true;

            console.log(`Updating email ${emailId} status to sent...`);
            await updateEmailStatus(emailId, "sent");
            console.log(`Email ${emailId} status updated to sent.`);

            console.log(`Email ${emailId} sent through Ethereal.`);
            console.log("Preview URL:", nodemailer.getTestMessageUrl(info));
        } catch (error) {
            const message =
                error instanceof Error ? error.message : "Unknown email sending error";

            if (emailSent) {
                console.error(
                    `Email ${emailId} was delivered by SMTP, but updating DB status failed: ${message}`
                );
                try {
                    await updateEmailStatus(emailId, "sent");
                } catch (retryDbError) {
                    console.error(`Retry updating status to sent failed for email ${emailId}:`, retryDbError);
                }
                return;
            }

            const isLastAttempt = job.attemptsMade >= (job.opts.attempts || 1) - 1;
            if (isLastAttempt) {
                await updateEmailStatus(emailId, "failed", message);
            } else {
                await resetEmailForRetry(emailId, message);
            }

            throw error;
        }
    },
    {
        connection: {
            host: parsedRedisUrl.hostname,
            port: Number(parsedRedisUrl.port || 6379),
            maxRetriesPerRequest: null,
        },
        concurrency: workerConcurrency,
    }
);

emailWorker.on("completed", (job) => {
    console.log(`Email job ${job.id} completed.`);
});

emailWorker.on("failed", (job, error) => {
    console.error(`Email job ${job?.id} failed:`, error.message);
});

emailWorker.on("error", (error) => {
    console.error("Email worker error:", error.message);
});
