
export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "processing"
  | "completed"
  | "cancelled"
  | "failed";

export interface Campaign {
  id: number;
  user_id: number;
  subject: string;
  body: string;
  start_at: Date;
  delay_seconds: number;
  hourly_limit: number | null;
  status: CampaignStatus;
  created_at: Date;
  updated_at: Date;
}
