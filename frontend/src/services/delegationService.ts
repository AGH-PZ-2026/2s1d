import type { CreateDelegationPayload, Delegation } from '../types/delegation';

const USE_MOCKS = import.meta.env.MODE === 'test';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let mockDelegations: Delegation[] = [
  { id: 1, item_id: 1, user_id: 2, group_id: null, permission: 'edit' },
  { id: 2, item_id: 1, user_id: 3, group_id: null, permission: 'manage' },
  { id: 3, item_id: 1, user_id: null, group_id: 1, permission: 'edit' },
];

let nextId = 4;

export const delegationService = {
  async getAll(itemId: number): Promise<Delegation[]> {
    if (USE_MOCKS) {
      await delay(100);
      return mockDelegations.filter((d) => d.item_id === itemId);
    }
    const response = await fetch(`/api/v1/items/${itemId}/delegations/`, {
      headers: authHeaders(),
    });
    await ensureOk(response);
    return response.json();
  },

  async create(
    itemId: number,
    payload: CreateDelegationPayload
  ): Promise<Delegation> {
    if (!payload.user_id && !payload.group_id) {
      throw new Error('Podaj użytkownika lub grupę.');
    }

    if (USE_MOCKS) {
      await delay(300);
      const delegation: Delegation = {
        id: nextId++,
        item_id: itemId,
        user_id: payload.user_id ?? null,
        group_id: payload.group_id ?? null,
        permission: payload.permission,
      };
      mockDelegations = [...mockDelegations, delegation];
      return delegation;
    }

    const response = await fetch(`/api/v1/items/${itemId}/delegations/`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    await ensureOk(response);
    return response.json();
  },

  async remove(itemId: number, delegationId: number): Promise<void> {
    if (USE_MOCKS) {
      await delay(300);
      const delegation = mockDelegations.find(
        (d) => d.id === delegationId && d.item_id === itemId
      );
      if (!delegation) throw new Error('Delegacja nie istnieje.');
      mockDelegations = mockDelegations.filter((d) => d.id !== delegationId);
      return;
    }

    const response = await fetch(
      `/api/v1/items/${itemId}/delegations/${delegationId}`,
      {
        method: 'DELETE',
        headers: authHeaders(),
      }
    );
    await ensureOk(response);
  },
};

function authHeaders(): Record<string, string> {
  const token = window.localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
