import type { Delegation, CreateDelegationPayload } from '../types/delegation';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let mockDelegations: Delegation[] = [
  { id: 1, item_id: 1, user_id: 2, group_id: null, permission: 'edit' },
  { id: 2, item_id: 1, user_id: 3, group_id: null, permission: 'manage' },
  { id: 3, item_id: 1, user_id: null, group_id: 1, permission: 'edit' },
];

let nextId = 4;

export const delegationService = {
  async getAll(itemId: number): Promise<Delegation[]> {
    await delay(100);
    return mockDelegations.filter((d) => d.item_id === itemId);
  },

  async create(
    itemId: number,
    payload: CreateDelegationPayload
  ): Promise<Delegation> {
    await delay(300);
    if (!payload.user_id && !payload.group_id) {
      throw new Error('Podaj użytkownika lub grupę.');
    }
    const delegation: Delegation = {
      id: nextId++,
      item_id: itemId,
      user_id: payload.user_id ?? null,
      group_id: payload.group_id ?? null,
      permission: payload.permission,
    };
    mockDelegations = [...mockDelegations, delegation];
    return delegation;
  },

  async remove(itemId: number, delegationId: number): Promise<void> {
    await delay(300);
    const delegation = mockDelegations.find(
      (d) => d.id === delegationId && d.item_id === itemId
    );
    if (!delegation) throw new Error('Delegacja nie istnieje.');
    mockDelegations = mockDelegations.filter((d) => d.id !== delegationId);
  },
};
