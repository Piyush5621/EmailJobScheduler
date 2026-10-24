
export type EmailStatus =
  | "scheduled"
  | "queued"
  | "sending"
  | "sent"
  | "failed"
  | "cancelled";

export interface EmailRecord {
  id: number;
  campaign_id: number;
  recipient_id: number;
  status: EmailStatus;
  scheduled_at: Date;
  sent_at: Date | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}
