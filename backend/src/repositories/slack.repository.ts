import { databasePool } from "../config/database.js";
import type { SlackIntegration } from "../models/slack.model.js";

export async function upsertSlackIntegration(
    userId: number,
    teamId: string,
    teamName: string | null,
    channelId: string | null,
    channelName: string | null,
    accessToken: string,
    incomingWebhookUrl: string | null
): Promise<SlackIntegration> {
    const result = await databasePool.query<SlackIntegration>(
        `INSERT INTO slack_integrations (
            user_id,
            team_id,
            team_name,
            channel_id,
            channel_name,
            access_token,
            incoming_webhook_url,
            updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
            team_id = EXCLUDED.team_id,
            team_name = EXCLUDED.team_name,
            channel_id = EXCLUDED.channel_id,
            channel_name = EXCLUDED.channel_name,
            access_token = EXCLUDED.access_token,
            incoming_webhook_url = EXCLUDED.incoming_webhook_url,
            updated_at = NOW()
        RETURNING
            id,
            user_id,
            team_id,
            team_name,
            channel_id,
            channel_name,
            access_token,
            incoming_webhook_url,
            created_at,
            updated_at`,
        [userId, teamId, teamName, channelId, channelName, accessToken, incomingWebhookUrl]
    );

    return result.rows[0];
}

export async function getSlackIntegrationByUserId(
    userId: number
): Promise<SlackIntegration | null> {
    const result = await databasePool.query<SlackIntegration>(
        `SELECT
            id,
            user_id,
            team_id,
            team_name,
            channel_id,
            channel_name,
            access_token,
            incoming_webhook_url,
            created_at,
            updated_at
        FROM slack_integrations
        WHERE user_id = $1`,
        [userId]
    );

    return result.rows[0] ?? null;
}

export async function deleteSlackIntegrationByUserId(
    userId: number
): Promise<boolean> {
    const result = await databasePool.query(
        `DELETE FROM slack_integrations WHERE user_id = $1`,
        [userId]
    );

    return (result.rowCount ?? 0) > 0;
}
