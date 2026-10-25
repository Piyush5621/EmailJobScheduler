export interface SlackIntegration {
    id: number;
    user_id: number;
    team_id: string;
    team_name: string | null;
    channel_id: string | null;
    channel_name: string | null;
    access_token: string;
    incoming_webhook_url: string | null;
    created_at: Date;
    updated_at: Date;
}
