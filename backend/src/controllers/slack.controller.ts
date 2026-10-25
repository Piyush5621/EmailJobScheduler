import type { RequestHandler } from "express";
import type { AppUser } from "../models/user.model.js";
import {
    getSlackAuthorizationUrl,
    handleSlackOAuthCallback,
    getSlackStatus,
    disconnectSlack,
    sendRateLimitNotification,
} from "../services/slack.service.js";
import { upsertSlackIntegration } from "../repositories/slack.repository.js";

const getClientUrl = () => process.env.CLIENT_URL || "/";

export const connectSlackController: RequestHandler = (req, res, next) => {
    try {
        const user = req.user as AppUser;
        const redirectUrl = getSlackAuthorizationUrl(user.id);
        res.redirect(redirectUrl);
    } catch (error: any) {
        const clientUrl = getClientUrl();
        const sep = clientUrl.includes("?") ? "&" : "?";
        res.redirect(`${clientUrl}${sep}slack_error=${encodeURIComponent(error?.message || "Failed to initiate Slack authorization.")}`);
    }
};

export const slackCallbackController: RequestHandler = async (req, res) => {
    const clientUrl = getClientUrl();
    const sep = clientUrl.includes("?") ? "&" : "?";

    try {
        const { code, state, error } = req.query as {
            code?: string;
            state?: string;
            error?: string;
        };

        if (error) {
            res.redirect(`${clientUrl}${sep}slack_error=${encodeURIComponent(error)}`);
            return;
        }

        if (!code || !state) {
            res.redirect(`${clientUrl}${sep}slack_error=missing_code_or_state`);
            return;
        }

        await handleSlackOAuthCallback(code, state);

        res.redirect(`${clientUrl}${sep}slack=connected`);
    } catch (error: any) {
        console.error("Slack OAuth callback failed:", error);
        res.redirect(`${clientUrl}${sep}slack_error=${encodeURIComponent(error?.message || "Slack OAuth connection failed.")}`);
    }
};

export const getSlackStatusController: RequestHandler = async (req, res, next) => {
    try {
        const user = req.user as AppUser;
        const status = await getSlackStatus(user.id);

        res.status(200).json({
            status: "success",
            data: status,
        });
    } catch (error) {
        next(error);
    }
};

export const saveSlackWebhookController: RequestHandler = async (req, res, next) => {
    try {
        const user = req.user as AppUser;
        const { webhookUrl, channelName } = req.body as { webhookUrl?: string; channelName?: string };

        if (!webhookUrl || typeof webhookUrl !== "string" || !webhookUrl.startsWith("https://hooks.slack.com/")) {
            res.status(400).json({
                status: "error",
                message: "A valid Slack Incoming Webhook URL starting with https://hooks.slack.com/ is required.",
            });
            return;
        }

        await upsertSlackIntegration(
            user.id,
            "webhook-team",
            "Slack Webhook",
            "webhook-channel",
            channelName || "General Alerts",
            "webhook-token",
            webhookUrl.trim()
        );

        res.status(200).json({
            status: "success",
            message: "Slack webhook integration configured successfully.",
            data: {
                connected: true,
                teamName: "Slack Webhook",
                channelName: channelName || "General Alerts",
            },
        });
    } catch (error) {
        next(error);
    }
};

export const testSlackNotificationController: RequestHandler = async (req, res, next) => {
    try {
        const user = req.user as AppUser;
        const sent = await sendRateLimitNotification(user.id, {
            campaignId: 999,
            subject: "Test Rate-Limit Alert Notification",
            limit: 100,
            currentCount: 101,
            nextWindowStart: new Date(Date.now() + 3600 * 1000),
        });

        if (!sent) {
            res.status(400).json({
                status: "error",
                message: "Could not send test notification. Please verify Slack is connected.",
            });
            return;
        }

        res.status(200).json({
            status: "success",
            message: "Test notification sent successfully to Slack!",
        });
    } catch (error) {
        next(error);
    }
};

export const disconnectSlackController: RequestHandler = async (req, res, next) => {
    try {
        const user = req.user as AppUser;
        const disconnected = await disconnectSlack(user.id);

        res.status(200).json({
            status: "success",
            message: disconnected ? "Slack integration disconnected." : "No active Slack integration found.",
        });
    } catch (error) {
        next(error);
    }
};
