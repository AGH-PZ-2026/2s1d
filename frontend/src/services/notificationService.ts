import { authHeaders, jsonAuthHeaders } from './authHeaders';

export interface NotificationPreference {
  id: number;
  userId: number;
  emailEnabled: boolean;
  pushEnabled: boolean;
  returnDueNoticeHours: number;
}

export interface NotificationEvent {
  id: number;
  userId: number;
  borrowingId: number | null;
  eventType: 'return_due' | 'borrowing_approved';
  channel: 'email' | 'push';
  payload: string;
  scheduledAt: string;
  sentAt: string | null;
  createdAt: string;
}

export const notificationService = {
  async getPreferences(): Promise<NotificationPreference> {
    const response = await fetch('/api/v1/notifications/preferences', {
      headers: authHeaders(),
    });
    await ensureOk(response);
    return response.json();
  },

  async updatePreferences(
    payload: Pick<
      NotificationPreference,
      'emailEnabled' | 'pushEnabled' | 'returnDueNoticeHours'
    >
  ): Promise<NotificationPreference> {
    const response = await fetch('/api/v1/notifications/preferences', {
      method: 'PUT',
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    });
    await ensureOk(response);
    return response.json();
  },

  async listEvents(): Promise<NotificationEvent[]> {
    const response = await fetch('/api/v1/notifications/events', {
      headers: authHeaders(),
    });
    await ensureOk(response);
    return response.json();
  },
};

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  let detail = `Błąd serwera (${response.status})`;
  try {
    const data = await response.json();
    if (typeof data.detail === 'string') detail = data.detail;
  } catch {
    // Keep fallback error.
  }
  throw new Error(detail);
}
