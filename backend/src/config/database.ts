import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing from the environment.");
}

export const databasePool = new Pool({
  connectionString: databaseUrl,
});

databasePool.on("error", (error) => {
  console.error("PostgreSQL connection error:", error.message);
});

export async function connectDatabase(): Promise<void> {
  const client = await databasePool.connect();

  try {
    await client.query("SELECT 1");
    console.log("Connected to PostgreSQL successfully.");

    // Auto-create database tables on fresh installation
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        avatar TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS recipients (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email VARCHAR(320) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_recipient_per_user UNIQUE (user_id, email)
      );

      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subject VARCHAR(998) NOT NULL,
        body TEXT NOT NULL,
        start_at TIMESTAMPTZ NOT NULL,
        delay_seconds INTEGER NOT NULL DEFAULT 0,
        hourly_limit INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS emails (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
        recipient_id INTEGER NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
        scheduled_at TIMESTAMPTZ NOT NULL,
        sent_at TIMESTAMPTZ,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_emails_campaign_id ON emails(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_emails_recipient_id ON emails(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_emails_status_scheduled_at ON emails(status, scheduled_at);

      CREATE TABLE IF NOT EXISTS slack_integrations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        team_id VARCHAR(255) NOT NULL,
        team_name VARCHAR(255),
        channel_id VARCHAR(255),
        channel_name VARCHAR(255),
        access_token TEXT NOT NULL,
        incoming_webhook_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_slack_integrations_user_id ON slack_integrations(user_id);
    `);
    console.log("Database schema initialized and verified.");
  } finally {
    client.release();
  }
}
