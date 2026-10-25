import "dotenv/config";
import http from "http";
import { connectDatabase, databasePool } from "./config/database.js";
import { connectRedis, redisClient } from "./config/redis.js";
import { emailWorker } from "./workers/email.worker.js";
import { emailQueue } from "./queues/email.queue.js";
import { verifyEmailConnection } from "./config/email.js";
import { initElasticsearch, esClient } from "./config/elasticsearch.js";

const PORT = process.env.PORT || 3000;

let server: http.Server | null = null;
let isShuttingDown = false;

async function startServer(): Promise<void> {
    console.log("Initializing EmailJobScheduler backend services...");

    await connectDatabase();
    await connectRedis();
    await emailWorker.waitUntilReady();
    await verifyEmailConnection();
    await initElasticsearch();

    const { default: app } = await import("./app.js");

    server = app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`BullMQ dashboard available at http://localhost:${PORT}/admin/queues`);
    });
    console.log("Email worker is running.");
}

async function gracefulShutdown(signal: string): Promise<void> {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\nReceived ${signal}. Starting graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
        console.error("Graceful shutdown timed out. Forcing process exit.");
        process.exit(1);
    }, 15000);

    try {
        if (server) {
            console.log("Stopping HTTP server from accepting new requests...");
            await new Promise<void>((resolve, reject) => {
                server!.close((err) => (err ? reject(err) : resolve()));
            });
            console.log("HTTP server closed.");
        }

        console.log("Closing BullMQ worker (waiting for in-flight jobs to complete)...");
        await emailWorker.close();
        console.log("BullMQ worker closed.");

        console.log("Closing BullMQ queue...");
        await emailQueue.close();
        console.log("BullMQ queue closed.");

        console.log("Closing Redis connection...");
        if (redisClient.isOpen) {
            await redisClient.quit();
        }
        console.log("Redis connection closed.");

        console.log("Draining PostgreSQL database pool...");
        await databasePool.end();
        console.log("PostgreSQL database pool drained.");

        console.log("Closing Elasticsearch client...");
        await esClient.close();
        console.log("Elasticsearch client closed.");

        clearTimeout(shutdownTimeout);
        console.log("Graceful shutdown complete. Exiting cleanly.");
        process.exit(0);
    } catch (error) {
        clearTimeout(shutdownTimeout);
        console.error("Error during graceful shutdown:", error);
        process.exit(1);
    }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

startServer().catch((error: unknown) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
