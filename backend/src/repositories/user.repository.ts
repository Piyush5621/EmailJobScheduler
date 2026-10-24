
import { databasePool } from "../config/database.js";
import type { AppUser, GoogleUserProfile } from "../models/user.model.js";

export async function saveGoogleUser(
  profile: GoogleUserProfile
): Promise<AppUser> {
  const result = await databasePool.query<AppUser>(
    `INSERT INTO users (google_id, name, email, avatar)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (google_id)
     DO UPDATE SET
       name = EXCLUDED.name,
       email = EXCLUDED.email,
       avatar = EXCLUDED.avatar,
       updated_at = NOW()
     RETURNING id, google_id, name, email, avatar`,
    [
      profile.googleId,
      profile.name,
      profile.email,
      profile.avatar ?? null,
    ]
  );

  return result.rows[0];
}


export async function findUserById(id: number): Promise<AppUser | null> {
  const result = await databasePool.query<AppUser>(
    `SELECT id, google_id, name, email, avatar
     FROM users
     WHERE id = $1`,
    [id]
  );

  return result.rows[0] ?? null;
}
