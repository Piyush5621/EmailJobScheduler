import { Client } from "@elastic/elasticsearch";

const esNode = process.env.ELASTICSEARCH_NODE || "http://localhost:9200";

export const esClient = new Client({
    node: esNode,
});

export const EMAILS_INDEX = "emails";

export async function initElasticsearch(): Promise<void> {
    try {
        const ping = await esClient.ping();
        if (!ping) {
            console.warn("Elasticsearch ping returned false. Indexing might be delayed.");
            return;
        }

        const indexExists = await esClient.indices.exists({ index: EMAILS_INDEX });
        if (!indexExists) {
            await esClient.indices.create({
                index: EMAILS_INDEX,
                mappings: {
                    properties: {
                        email_id: { type: "integer" },
                        campaign_id: { type: "integer" },
                        user_id: { type: "integer" },
                        recipient_id: { type: "integer" },
                        recipient_email: { type: "keyword" },
                        recipient_name: { type: "text" },
                        subject: { type: "text" },
                        body: { type: "text" },
                        status: { type: "keyword" },
                        scheduled_at: { type: "date" },
                        sent_at: { type: "date" },
                        error_message: { type: "text" },
                        created_at: { type: "date" },
                        updated_at: { type: "date" },
                    },
                },
            });
            console.log(`Elasticsearch index '${EMAILS_INDEX}' created successfully.`);
        } else {
            console.log(`Elasticsearch connected. Index '${EMAILS_INDEX}' ready.`);
        }
    } catch (error) {
        console.warn(
            "Elasticsearch initialization note:",
            error instanceof Error ? error.message : error
        );
    }
}
