
import { Queue } from "bullmq";
import { redisClient } from "../config/redis.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const emailQueue = new Queue("email-scheduler", {
  connection: {
    host: new URL(redisUrl).hostname,
    port: Number(new URL(redisUrl).port || 6379),
    maxRetriesPerRequest: null,
  },
});

emailQueue.on("error", (error) => {
  console.error("Email queue error:", error.message);
});
