import type { PoolClient } from "pg";
import type { EmailRecord } from "../models/email.model.js";
import { databasePool } from "../config/database.js";

export async function createEmailsForCampaign(
    client: PoolClient,
    campaignId: number,
    recipientIds: number[],
    startAt: Date,
    delaySeconds: number
): Promise<EmailRecord[]> {
    if (recipientIds.length === 0) {
        return [];
    }

    const values: (number | Date)[] = [];

    const placeholders = recipientIds.map((recipientId, index) => {
        const base = index * 3;

        values.push(
            campaignId,
            recipientId,
            new Date(startAt.getTime() + index * delaySeconds * 1000)
        );

        return `($${base + 1}, $${base + 2}, $${base + 3})`;
    });

    const result = await client.query<EmailRecord>(
        `INSERT INTO emails (
       campaign_id,
       recipient_id,
       scheduled_at
     )
     VALUES ${placeholders.join(", ")}
     RETURNING
       id,
       campaign_id,
       recipient_id,
       status,
       scheduled_at,
       sent_at,
       error_message,
       created_at,
       updated_at`,
        values
    );

    return result.rows;
}

export async function getEmailsByCampaignId(
    campaignId: number
): Promise<EmailRecord[]> {
    const result = await databasePool.query<EmailRecord>(
        `SELECT
       id,
       campaign_id,
       recipient_id,
       status,
       scheduled_at,
       sent_at,
       error_message,
       created_at,
       updated_at
     FROM emails
     WHERE campaign_id = $1
     ORDER BY scheduled_at ASC`,
        [campaignId]
    );

    return result.rows;
}

export interface EmailDetails {
    id: number;
    campaign_id: number;
    recipient_id: number;
    user_id: number;
    hourly_limit: number | null;
    status: EmailRecord["status"];
    subject: string;
    body: string;
    recipient_email: string;
    recipient_name: string | null;
}

export async function getEmailDetailsById(
    emailId: number
): Promise<EmailDetails | null> {
    const result = await databasePool.query<EmailDetails>(
        `SELECT
       e.id,
       e.campaign_id,
       e.recipient_id,
       e.status,
       c.user_id,
       c.hourly_limit,
       c.subject,
       c.body,
       r.email AS recipient_email,
       r.name AS recipient_name
     FROM emails e
     INNER JOIN campaigns c ON c.id = e.campaign_id
     INNER JOIN recipients r ON r.id = e.recipient_id
     WHERE e.id = $1`,
        [emailId]
    );

    return result.rows[0] ?? null;
}

export async function claimEmailForSending(
    emailId: number
): Promise<boolean> {
    const result = await databasePool.query(
        `UPDATE emails
     SET status = 'sending',
         updated_at = NOW()
     WHERE id = $1
       AND status = 'scheduled'
     RETURNING id`,
        [emailId]
    );

    return result.rowCount === 1;
}

export async function updateEmailStatus(
    emailId: number,
    status: EmailRecord["status"],
    errorMessage: string | null = null
): Promise<void> {
    await databasePool.query(
        `UPDATE emails
     SET status = $2,
         sent_at = CASE WHEN $2::varchar = 'sent' THEN NOW() ELSE sent_at END,
         error_message = $3,
         updated_at = NOW()
     WHERE id = $1`,
        [emailId, status, errorMessage]
    );
}

export async function isEmailAlreadySent(
    emailId: number
): Promise<boolean> {
    const result = await databasePool.query<{ status: EmailRecord["status"] }>(
        `SELECT status
     FROM emails
     WHERE id = $1`,
        [emailId]
    );

    return result.rows[0]?.status === "sent";
}

export async function resetEmailForRetry(
    emailId: number,
    errorMessage: string
): Promise<void> {
    await databasePool.query(
        `UPDATE emails
     SET status = 'scheduled',
         error_message = $2,
         updated_at = NOW()
     WHERE id = $1
       AND status IN ('failed', 'sending')`,
        [emailId, errorMessage]
    );
}

export async function rescheduleEmail(
    emailId: number,
    newScheduledAt: Date
): Promise<void> {
    await databasePool.query(
        `UPDATE emails
     SET scheduled_at = $2,
         status = 'scheduled',
         updated_at = NOW()
     WHERE id = $1`,
        [emailId, newScheduledAt]
    );
}
