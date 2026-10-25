import type { RequestHandler } from "express";
import type { AppUser } from "../models/user.model.js";
import {
    getSlackAuthorizationUrl,
    handleSlackOAuthCallback,
    getSlackStatus,
    disconnectSlack,
} from "../services/slack.service.js";

export const connectSlackController: RequestHandler = (req, res, next) => {
    try {
        const user = req.user as AppUser;
        const redirectUrl = getSlackAuthorizationUrl(user.id);
        res.redirect(redirectUrl);
    } catch (error) {
        next(error);
    }
};

export const slackCallbackController: RequestHandler = async (req, res, next) => {
    try {
        const { code, state, error } = req.query as {
            code?: string;
            state?: string;
            error?: string;
        };

        if (error) {
            res.status(400).json({
                status: "error",
                message: `Slack authorization was denied or failed: ${error}`,
            });
            return;
        }

        if (!code || !state) {
            res.status(400).json({
                status: "error",
                message: "Missing code or state parameter from Slack callback.",
            });
            return;
        }

        const result = await handleSlackOAuthCallback(code, state);

        res.status(200).json({
            status: "success",
            message: "Slack workspace connected successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
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
