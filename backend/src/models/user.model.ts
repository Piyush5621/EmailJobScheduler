export interface AppUser {
  id: number;
  google_id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface GoogleUserProfile {
  googleId: string;
  name: string;
  email: string;
  avatar?: string;
}