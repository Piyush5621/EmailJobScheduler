
import { emailQueue } from "../queues/email.queue.js";
import type { EmailRecord } from "../models/email.model.js";

export async function scheduleEmailJob(
    email: EmailRecord
): Promise<void> {
    const delay = Math.max(
        0,
        new Date(email.scheduled_at).getTime() - Date.now()
    );

    await emailQueue.add(
        "send-email",
        {
            emailId: email.id,
            campaignId: email.campaign_id,
            recipientId: email.recipient_id,
        },
        {
            jobId: `email-${email.id}`,
            delay,
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 5000,
            },
            removeOnComplete: false,
            removeOnFail: false,
        }

    );
}

export async function scheduleCampaignEmails(
    emails: EmailRecord[]
): Promise<void> {
    for (const email of emails) {
        await scheduleEmailJob(email);
    }
}
