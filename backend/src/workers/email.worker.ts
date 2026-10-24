
import { Worker } from "bullmq";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const parsedRedisUrl = new URL(redisUrl);

export const emailWorker = new Worker(
  "email-scheduler",
  async (job) => {
    if (job.name !== "send-email") {
      throw new Error(`Unsupported job type: ${job.name}`);
    }

    const { emailId, campaignId, recipientId } = job.data as {
      emailId: number;
      campaignId: number;
      recipientId: number;
    };

    console.log("Processing scheduled email job:", {
      emailId,
      campaignId,
      recipientId,
    });
  },
  {
    connection: {
      host: parsedRedisUrl.hostname,
      port: Number(parsedRedisUrl.port || 6379),
      maxRetriesPerRequest: null,
    },
    concurrency: 5,
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
