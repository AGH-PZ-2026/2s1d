import { authHeaders, jsonAuthHeaders } from './authHeaders';

export interface User {
  id: number;
  email: string;
  role: 'admin' | 'user';
  isActive: boolean;
  isApproved: boolean;
}

export const userService = {
  async getAll(): Promise<User[]> {
    const response = await fetch('/api/v1/users', {
      headers: authHeaders(),
    });
    await ensureOk(response);
    const data: User[] = await response.json();
    return data;
  },

  async approve(id: number): Promise<User> {
    const response = await fetch(`/api/v1/users/${id}/approve`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    await ensureOk(response);
    const data: User = await response.json();
    return data;
  },

  async reject(id: number): Promise<User> {
    const response = await fetch(`/api/v1/users/${id}/reject`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    await ensureOk(response);
    const data: User = await response.json();
    return data;
  },

  async updateRole(id: number, role: 'admin' | 'user'): Promise<User> {
    const response = await fetch(`/api/v1/users/${id}/role`, {
      method: 'PATCH',
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    await ensureOk(response);
    const data: User = await response.json();
    return data;
  },
};

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  let detail = `Błąd serwera (${response.status})`;
  try {
    const data: { detail?: string } = await response.json();
    if (typeof data.detail === 'string') detail = data.detail;
  } catch {
    // Fallback
  }
  throw new Error(detail);
}
