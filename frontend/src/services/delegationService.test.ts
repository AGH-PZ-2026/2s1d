import { describe, it, expect, beforeEach } from 'vitest';
import { delegationService } from './delegationService';

describe('delegationService', () => {
  beforeEach(async () => {
    // reset stanu przez pobranie i usunięcie własnych delegacji
  });

  it('pobiera delegacje dla przedmiotu', async () => {
    const delegations = await delegationService.getAll(1);
    expect(delegations.length).toBeGreaterThan(0);
  });

  it('zwraca tylko delegacje dla danego przedmiotu', async () => {
    const delegations = await delegationService.getAll(1);
    expect(delegations.every((d) => d.item_id === 1)).toBe(true);
  });

  it('tworzy delegację dla użytkownika', async () => {
    const delegation = await delegationService.create(1, {
      user_id: 10,
      permission: 'edit',
    });
    expect(delegation.user_id).toBe(10);
    expect(delegation.permission).toBe('edit');
    expect(delegation.group_id).toBeNull();
  });

  it('tworzy delegację dla grupy', async () => {
    const delegation = await delegationService.create(1, {
      group_id: 5,
      permission: 'manage',
    });
    expect(delegation.group_id).toBe(5);
    expect(delegation.permission).toBe('manage');
    expect(delegation.user_id).toBeNull();
  });

  it('rzuca błąd gdy nie podano użytkownika ani grupy', async () => {
    await expect(
      delegationService.create(1, { permission: 'edit' })
    ).rejects.toThrow('Podaj użytkownika lub grupę.');
  });

  it('usuwa delegację', async () => {
    const delegation = await delegationService.create(1, {
      user_id: 99,
      permission: 'edit',
    });
    await delegationService.remove(1, delegation.id);
    const all = await delegationService.getAll(1);
    expect(all.find((d) => d.id === delegation.id)).toBeUndefined();
  });

  it('rzuca błąd gdy delegacja nie istnieje', async () => {
    await expect(delegationService.remove(1, 99999)).rejects.toThrow(
      'Delegacja nie istnieje.'
    );
  });

  it('rzuca błąd gdy delegacja należy do innego przedmiotu', async () => {
    const delegation = await delegationService.create(1, {
      user_id: 50,
      permission: 'edit',
    });
    await expect(delegationService.remove(2, delegation.id)).rejects.toThrow(
      'Delegacja nie istnieje.'
    );
  });
});
