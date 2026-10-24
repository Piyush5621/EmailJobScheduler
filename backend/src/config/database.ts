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
  } finally {
    client.release();
  }
}
