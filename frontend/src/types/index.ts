export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
}

export interface EmailItem {
  id: number | string;
  email_id?: number;
  campaign_id: number;
  recipient_id: number;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  body: string;
  status: 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  scheduled_at: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: number;
  user_id: number;
  subject: string;
  body: string;
  start_at: string;
  delay_seconds: number;
  hourly_limit: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Recipient {
  id: number;
  user_id: number;
  email: string;
  name: string | null;
}

export interface CreateCampaignPayload {
  subject: string;
  body: string;
  startAt: string;
  delaySeconds: number;
  hourlyLimit: number | null;
  recipientIds: number[];
}
