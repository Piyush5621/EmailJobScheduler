
import { databasePool } from "../config/database.js";
import type { PoolClient } from "pg";
import type { Campaign } from "../models/campaign.model.js";

export async function createCampaign(
  client: PoolClient,
  userId: number,
  subject: string,
  body: string,
  startAt: Date,
  delaySeconds: number,
  hourlyLimit: number | null
): Promise<Campaign> {
  const result = await client.query<Campaign>(
    `INSERT INTO campaigns (
       user_id,
       subject,
       body,
       start_at,
       delay_seconds,
       hourly_limit
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING
       id, user_id, subject, body, start_at, delay_seconds,
       hourly_limit, status, created_at, updated_at`,
    [userId, subject, body, startAt, delaySeconds, hourlyLimit]
  );

  return result.rows[0];
}

export async function getCampaignsByUserId(
  userId: number
): Promise<Campaign[]> {
  const result = await databasePool.query<Campaign>(
    `SELECT
       id, user_id, subject, body, start_at, delay_seconds,
       hourly_limit, status, created_at, updated_at
     FROM campaigns
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}
