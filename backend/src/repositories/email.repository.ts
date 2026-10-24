
import type { PoolClient } from "pg";
import type { EmailRecord } from "../models/email.model.js";

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
  const { databasePool } = await import("../config/database.js");

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
