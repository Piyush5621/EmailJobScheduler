import type { User, EmailItem, Campaign, Recipient, CreateCampaignPayload } from '../types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(endpoint, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    throw new ApiError('Unauthorized. Please log in.', 401);
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.message || `Request failed with status ${res.status}`;
    throw new ApiError(errorMsg, res.status);
  }

  return data;
}

export const api = {
  // Auth
  async getMe(): Promise<User | null> {
    try {
      const res = await request<{ status: string; data: { user: User } }>('/auth/me');
      return res.data.user;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return null;
      }
      return null;
    }
  },

  async logout(): Promise<void> {
    await request('/auth/logout', { method: 'POST' });
  },

  // Search & List Emails via Elasticsearch
  async searchEmails(options: { query?: string; status?: string } = {}): Promise<{ total: number; emails: EmailItem[] }> {
    const params = new URLSearchParams();
    if (options.query && options.query.trim()) params.set('q', options.query.trim());
    if (options.status) params.set('status', options.status);
    params.set('size', '50');

    const res = await request<{ status: string; data: { total: number; emails: EmailItem[] } }>(
      `/api/emails/search?${params.toString()}`
    );
    return res.data;
  },

  // Recipients
  async getRecipients(): Promise<Recipient[]> {
    const res = await request<{ status: string; data: { recipients: Recipient[] } }>('/api/recipients');
    return res.data.recipients;
  },

  async createRecipient(email: string, name: string | null = null): Promise<Recipient> {
    const res = await request<{ status: string; data: { recipient: Recipient } }>('/api/recipients', {
      method: 'POST',
      body: JSON.stringify({ email, name }),
    });
    return res.data.recipient;
  },

  // Campaigns
  async getCampaigns(): Promise<Campaign[]> {
    const res = await request<{ status: string; data: { campaigns: Campaign[] } }>('/api/campaigns');
    return res.data.campaigns;
  },

  async createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
    const res = await request<{ status: string; data: { campaign: Campaign } }>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data.campaign;
  },

  // Slack Status
  async getSlackStatus(): Promise<{ connected: boolean; teamName: string | null; channelName: string | null }> {
    try {
      const res = await request<{ status: string; data: { connected: boolean; teamName: string | null; channelName: string | null } }>(
        '/api/slack/status'
      );
      return res.data;
    } catch {
      return { connected: false, teamName: null, channelName: null };
    }
  },
};
