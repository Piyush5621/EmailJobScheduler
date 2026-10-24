import "dotenv/config";
import { connectDatabase } from "./config/database.js";
import { connectRedis } from "./config/redis.js";
import { emailWorker } from "./workers/email.worker.js";

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  await connectDatabase();
  await connectRedis();
  await emailWorker.waitUntilReady();

  const { default: app } = await import("./app.js");

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
  console.log("Email worker is running.");
}

startServer().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
