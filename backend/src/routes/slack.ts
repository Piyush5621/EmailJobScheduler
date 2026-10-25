import { Router } from "express";
import { requireAuth } from "../middleware/require-auth.js";
import {
    connectSlackController,
    slackCallbackController,
    getSlackStatusController,
    saveSlackWebhookController,
    testSlackNotificationController,
    disconnectSlackController,
} from "../controllers/slack.controller.js";

export const slackRouter = Router();

slackRouter.get("/authorize", requireAuth, connectSlackController);
slackRouter.get("/callback", slackCallbackController);
slackRouter.get("/status", requireAuth, getSlackStatusController);
slackRouter.post("/webhook", requireAuth, saveSlackWebhookController);
slackRouter.post("/test", requireAuth, testSlackNotificationController);
slackRouter.delete("/disconnect", requireAuth, disconnectSlackController);
