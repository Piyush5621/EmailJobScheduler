import { esClient, EMAILS_INDEX } from "../config/elasticsearch.js";
import { getEmailDetailsById } from "../repositories/email.repository.js";
import { databasePool } from "../config/database.js";

export interface EmailSearchOptions {
    query?: string;
    status?: string;
    from?: number;
    size?: number;
}

export interface EmailSearchHit {
    id: string;
    email_id: number;
    campaign_id: number;
    user_id: number;
    recipient_id: number;
    recipient_email: string;
    recipient_name: string | null;
    subject: string;
    body: string;
    status: string;
    scheduled_at: Date;
    sent_at: Date | null;
    error_message: string | null;
    updated_at: Date;
}

export async function indexEmail(emailId: number): Promise<void> {
    try {
        const email = await getEmailDetailsById(emailId);
        if (!email) return;

        const rowRes = await databasePool.query<{
            scheduled_at: Date;
            sent_at: Date | null;
            error_message: string | null;
            created_at: Date;
            updated_at: Date;
        }>(
            `SELECT scheduled_at, sent_at, error_message, created_at, updated_at
             FROM emails WHERE id = $1`,
            [emailId]
        );
        const meta = rowRes.rows[0];

        await esClient.index({
            index: EMAILS_INDEX,
            id: emailId.toString(),
            document: {
                email_id: email.id,
                campaign_id: email.campaign_id,
                user_id: email.user_id,
                recipient_id: email.recipient_id,
                recipient_email: email.recipient_email,
                recipient_name: email.recipient_name,
                subject: email.subject,
                body: email.body,
                status: email.status,
                scheduled_at: meta?.scheduled_at || new Date(),
                sent_at: meta?.sent_at || null,
                error_message: meta?.error_message || null,
                created_at: meta?.created_at || new Date(),
                updated_at: meta?.updated_at || new Date(),
            },
        });
    } catch (error) {
        console.warn(
            `[Elasticsearch] Indexing failed for email ${emailId}:`,
            error instanceof Error ? error.message : error
        );
    }
}

export async function updateEmailIndexStatus(
    emailId: number,
    status: string,
    sentAt: Date | null = null,
    errorMessage: string | null = null
): Promise<void> {
    try {
        const doc: Record<string, any> = {
            status,
            updated_at: new Date(),
        };
        if (sentAt) doc.sent_at = sentAt;
        if (errorMessage !== undefined) doc.error_message = errorMessage;

        await esClient.update({
            index: EMAILS_INDEX,
            id: emailId.toString(),
            doc,
            doc_as_upsert: true,
        });
    } catch (error) {
        console.warn(
            `[Elasticsearch] Status update failed for email ${emailId}:`,
            error instanceof Error ? error.message : error
        );
    }
}

export async function searchEmails(
    userId: number,
    options: EmailSearchOptions
): Promise<{ total: number; emails: EmailSearchHit[] }> {
    const mustClauses: any[] = [{ term: { user_id: userId } }];

    if (options.status) {
        mustClauses.push({ term: { status: options.status } });
    }

    if (options.query && options.query.trim()) {
        mustClauses.push({
            multi_match: {
                query: options.query.trim(),
                fields: [
                    "recipient_email^3",
                    "subject^2",
                    "body",
                    "recipient_name",
                ],
                fuzziness: "AUTO",
            },
        });
    }

    const response = await esClient.search({
        index: EMAILS_INDEX,
        from: options.from || 0,
        size: options.size || 20,
        query: { bool: { must: mustClauses } },
        sort: [{ email_id: "desc" }],
    });

    const total =
        typeof response.hits.total === "number"
            ? response.hits.total
            : response.hits.total?.value || 0;

    const emails = response.hits.hits.map((hit) => ({
        id: hit._id,
        ...(hit._source as any),
    }));

    return { total, emails };
}

export async function reindexAllEmails(userId?: number): Promise<number> {
    const params: any[] = [];
    let query = `
        SELECT
            e.id AS email_id,
            e.campaign_id,
            e.recipient_id,
            c.user_id,
            e.status,
            e.scheduled_at,
            e.sent_at,
            e.error_message,
            e.created_at,
            e.updated_at,
            c.subject,
            c.body,
            r.email AS recipient_email,
            r.name AS recipient_name
        FROM emails e
        INNER JOIN campaigns c ON c.id = e.campaign_id
        INNER JOIN recipients r ON r.id = e.recipient_id
    `;

    if (userId) {
        query += ` WHERE c.user_id = $1`;
        params.push(userId);
    }

    const result = await databasePool.query(query, params);
    if (result.rows.length === 0) return 0;

    const operations = result.rows.flatMap((row) => [
        { index: { _index: EMAILS_INDEX, _id: row.email_id.toString() } },
        row,
    ]);

    const bulkRes = await esClient.bulk({ operations, refresh: true });
    if (bulkRes.errors) {
        console.warn("[Elasticsearch] Bulk reindex had errors.");
    }

    return result.rows.length;
}
