import { databasePool } from "../config/database.js";
import type { Campaign } from "../models/campaign.model.js";
import {
    createCampaign,
    getCampaignsByUserId,
} from "../repositories/campaign.repository.js";
import {
    createEmailsForCampaign,
    getEmailsByCampaignId
} from "../repositories/email.repository.js";

import { scheduleCampaignEmails } from "./email-scheduler.service.js";
import { indexEmail } from "./elasticsearch.service.js";

export async function saveCampaign(
    userId: number,
    subject: string,
    body: string,
    startAt: Date,
    delaySeconds: number,
    hourlyLimit: number | null,
    recipientIds: number[]
): Promise<Campaign> {
    const normalizedSubject = subject.trim();
    const normalizedBody = body.trim();

    if (!normalizedSubject) {
        throw new Error("Campaign subject is required.");
    }

    if (!normalizedBody) {
        throw new Error("Campaign body is required.");
    }

    if (Number.isNaN(startAt.getTime())) {
        throw new Error("A valid campaign start time is required.");
    }

    if (!Number.isInteger(delaySeconds) || delaySeconds < 0) {
        throw new Error("Delay must be a non-negative whole number.");
    }

    if (
        hourlyLimit !== null &&
        (!Number.isInteger(hourlyLimit) || hourlyLimit <= 0)
    ) {
        throw new Error("Hourly limit must be a positive whole number.");
    }

    if (
        !Array.isArray(recipientIds) ||
        recipientIds.length === 0 ||
        recipientIds.some((id) => !Number.isInteger(id) || id <= 0)
    ) {
        throw new Error("Select at least one valid recipient.");
    }

    const uniqueRecipientIds = [...new Set(recipientIds)];
    const client = await databasePool.connect();

    try {
        await client.query("BEGIN");

        const recipientResult = await client.query<{ id: number }>(
            `SELECT id
       FROM recipients
       WHERE user_id = $1
         AND id = ANY($2::int[])`,
            [userId, uniqueRecipientIds]
        );

        if (recipientResult.rows.length !== uniqueRecipientIds.length) {
            throw new Error("One or more recipients are invalid.");
        }

        const campaign = await createCampaign(
            client,
            userId,
            normalizedSubject,
            normalizedBody,
            startAt,
            delaySeconds,
            hourlyLimit
        );

        await createEmailsForCampaign(
            client,
            campaign.id,
            uniqueRecipientIds,
            startAt,
            delaySeconds
        );

        await client.query("COMMIT");

        const emails = await getEmailsByCampaignId(campaign.id);
        await scheduleCampaignEmails(emails);

        // Immediately index all campaign emails in Elasticsearch
        for (const email of emails) {
            indexEmail(email.id).catch((err) => {
                console.warn(`[Elasticsearch] Indexing warning for email ${email.id}:`, err);
            });
        }

        return campaign;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error("Failed to roll back campaign transaction:", rollbackError);
        }

        throw error;
    } finally {
        client.release();
    }
}

export async function listCampaigns(
    userId: number
): Promise<Campaign[]> {
    return getCampaignsByUserId(userId);
}
