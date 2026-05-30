import type {
  Status,
  CreateStatusPayload,
  UpdateStatusPayload,
} from '../types/status';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api/v1';

async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      (body as { detail?: string }).detail ?? `HTTP ${response.status}`,
    );
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export const statusService = {
  async getAll(): Promise<Status[]> {
    return request<Status[]>('/statuses');
  },

  async create(payload: CreateStatusPayload): Promise<Status> {
    return request<Status>('/statuses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id: number, payload: UpdateStatusPayload): Promise<Status> {
    return request<Status>(`/statuses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async remove(id: number): Promise<void> {
    return request<void>(`/statuses/${id}`, {
      method: 'DELETE',
    });
  },
};
