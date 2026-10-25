import {
    upsertSlackIntegration,
    getSlackIntegrationByUserId,
    deleteSlackIntegrationByUserId,
} from "../repositories/slack.repository.js";

const slackClientId = process.env.SLACK_CLIENT_ID || "";
const slackClientSecret = process.env.SLACK_CLIENT_SECRET || "";
const slackRedirectUri =
    process.env.SLACK_REDIRECT_URI || "http://localhost:3000/integrations/slack/callback";

export function getSlackAuthorizationUrl(userId: number): string {
    if (!slackClientId) {
        throw new Error("SLACK_CLIENT_ID is not configured in environment variables.");
    }

    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString("base64url");
    const scope = "incoming-webhook,chat:write";

    const params = new URLSearchParams({
        client_id: slackClientId,
        scope,
        redirect_uri: slackRedirectUri,
        state,
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

export async function handleSlackOAuthCallback(
    code: string,
    state: string
): Promise<{ teamName: string | null; channelName: string | null }> {
    if (!slackClientId || !slackClientSecret) {
        throw new Error("Slack OAuth credentials are missing from environment variables.");
    }

    let parsedState: { userId: number };
    try {
        parsedState = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
    } catch {
        throw new Error("Invalid Slack OAuth state parameter.");
    }

    const response = await fetch("https://slack.com/api/oauth.v2.access", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: slackClientId,
            client_secret: slackClientSecret,
            code,
            redirect_uri: slackRedirectUri,
        }),
    });

    const data = (await response.json()) as {
        ok: boolean;
        error?: string;
        access_token: string;
        team?: { id: string; name: string };
        incoming_webhook?: {
            url: string;
            channel: string;
            channel_id: string;
        };
    };

    if (!data.ok) {
        throw new Error(`Slack OAuth error: ${data.error || "Failed to exchange token"}`);
    }

    const teamId = data.team?.id || "unknown";
    const teamName = data.team?.name || null;
    const channelId = data.incoming_webhook?.channel_id || null;
    const channelName = data.incoming_webhook?.channel || null;
    const accessToken = data.access_token;
    const incomingWebhookUrl = data.incoming_webhook?.url || null;

    await upsertSlackIntegration(
        parsedState.userId,
        teamId,
        teamName,
        channelId,
        channelName,
        accessToken,
        incomingWebhookUrl
    );

    return { teamName, channelName };
}

export async function getSlackStatus(userId: number): Promise<{
    connected: boolean;
    teamName: string | null;
    channelName: string | null;
}> {
    const integration = await getSlackIntegrationByUserId(userId);
    if (!integration) {
        return { connected: false, teamName: null, channelName: null };
    }

    return {
        connected: true,
        teamName: integration.team_name,
        channelName: integration.channel_name,
    };
}

export async function disconnectSlack(userId: number): Promise<boolean> {
    return deleteSlackIntegrationByUserId(userId);
}

export interface RateLimitAlertPayload {
    campaignId: number;
    subject: string;
    limit: number;
    currentCount: number;
    nextWindowStart: Date;
}

export async function sendRateLimitNotification(
    userId: number,
    payload: RateLimitAlertPayload
): Promise<boolean> {
    try {
        const integration = await getSlackIntegrationByUserId(userId);

        if (!integration) {
            console.log(
                `User ${userId} reached hourly rate limit, but Slack is not connected. Skipping notification.`
            );
            return false;
        }

        const messageBody = {
            text: `⚠️ Hourly Email Rate Limit Reached for Campaign #${payload.campaignId}`,
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "⚠️ Hourly Email Rate Limit Reached",
                        emoji: true,
                    },
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*Campaign ID:*\n#${payload.campaignId}`,
                        },
                        {
                            type: "mrkdwn",
                            text: `*Subject:*\n${payload.subject}`,
                        },
                        {
                            type: "mrkdwn",
                            text: `*Hourly Limit:*\n${payload.limit} emails/hour`,
                        },
                        {
                            type: "mrkdwn",
                            text: `*Next Send Window:*\n${payload.nextWindowStart.toUTCString()}`,
                        },
                    ],
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: "Emails have been automatically rescheduled for the next window without dropping.",
                        },
                    ],
                },
            ],
        };

        if (integration.incoming_webhook_url) {
            const webhookRes = await fetch(integration.incoming_webhook_url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(messageBody),
            });

            if (webhookRes.ok) {
                console.log(`Slack rate limit notification delivered via webhook for user ${userId}.`);
                return true;
            }
        }

        if (integration.access_token && integration.channel_id) {
            const apiRes = await fetch("https://slack.com/api/chat.postMessage", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${integration.access_token}`,
                },
                body: JSON.stringify({
                    channel: integration.channel_id,
                    ...messageBody,
                }),
            });

            const apiData = (await apiRes.json()) as { ok: boolean; error?: string };
            if (apiData.ok) {
                console.log(`Slack rate limit notification delivered via API for user ${userId}.`);
                return true;
            }
        }

        console.warn(`Could not deliver Slack rate limit notification for user ${userId}.`);
        return false;
    } catch (error) {
        console.error("Failed to send Slack rate limit notification:", error);
        return false;
    }
}
