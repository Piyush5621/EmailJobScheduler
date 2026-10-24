export interface Recipient {
  id: number;
  user_id: number;
  email: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}