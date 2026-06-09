import { authHeaders } from './authHeaders';

export type AuditLogAction =
  | 'ITEM_CREATED'
  | 'ITEM_UPDATED'
  | 'STATUS_CHANGED'
  | 'LOCATION_CHANGED'
  | 'ITEM_BORROWED'
  | 'BORROWING_REQUESTED'
  | 'BORROWING_APPROVED'
  | 'BORROWING_RETURNED'
  | 'PHOTO_ADDED'
  | 'OWNER_CHANGED'
  | 'DELEGATES_CHANGED';

export interface AuditLogEntry {
  id: number;
  user_id: number;
  action: AuditLogAction;
  item_id: number;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  timestamp: string;
}

export const auditLogService = {
  async getAll(): Promise<AuditLogEntry[]> {
    const response = await fetch('/api/v1/audit-logs/', {
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
