import { databasePool } from "../config/database.js";
import type { Recipient } from "../models/recipient.model.js";

export async function createRecipient(
  userId: number,
  email: string,
  name: string | null = null
): Promise<Recipient> {
  const result = await databasePool.query<Recipient>(
    `INSERT INTO recipients (user_id, email, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, email)
     DO UPDATE SET
       name = COALESCE(EXCLUDED.name, recipients.name),
       updated_at = NOW()
     RETURNING id, user_id, email, name, created_at, updated_at`,
    [userId, email, name]
  );

  return result.rows[0];
}

export async function getRecipientsByUserId(
  userId: number
): Promise<Recipient[]> {
  const result = await databasePool.query<Recipient>(
    `SELECT id, user_id, email, name, created_at, updated_at
     FROM recipients
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );

  return result.rows;
}