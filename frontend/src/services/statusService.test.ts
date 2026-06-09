import { describe, it, expect } from 'vitest';
import { statusService } from './statusService';

describe('statusService - Testy Integracyjne', () => {
  it('pobiera wszystkie statusy', async () => {
    const statuses = await statusService.getAll();
    expect(statuses.length).toBeGreaterThan(0);
  });

  it('zwraca statusy systemowe', async () => {
    const statuses = await statusService.getAll();
    const system = statuses.filter((s) => s.type === 'system');
    expect(system.length).toBeGreaterThan(0);
  });

  it('tworzy nowy status własny', async () => {
    const status = await statusService.create({
      name: 'Status Automatyczny',
      slug: 'status-automatyczny',
    });
    expect(status.name).toBe('Status Automatyczny');
    expect(status.type).toBe('custom');

    await statusService.remove(status.id);
  });

  it('rzuca błąd gdy NAZWA już istnieje', async () => {
    const all = await statusService.getAll();
    if (all.length > 0) {
      const existingStatus = all[0];
      await expect(
        statusService.create({ name: existingStatus.name, slug: 'cokolwiek' })
      ).rejects.toThrow();
    }
  });

  it('edytuje własny status', async () => {
    const temp = await statusService.create({
      name: 'Do Edycji',
      slug: 'do-edycji',
    });

    const updated = await statusService.update(temp.id, {
      name: 'Status Zmieniony',
    });
    expect(updated.name).toBe('Status Zmieniony');

    await statusService.remove(temp.id);
  });

  it('nie pozwala edytować statusu systemowego', async () => {
    const all = await statusService.getAll();
    const system = all.find((s) => s.type === 'system')!;
    await expect(
      statusService.update(system.id, { name: 'Hack' })
    ).rejects.toThrow('403');
  });

  it('usuwa własny status', async () => {
    const temp = await statusService.create({
      name: 'Do Usunięcia',
      slug: 'do-usuniecia',
    });

    await expect(statusService.remove(temp.id)).resolves.not.toThrow();

    const after = await statusService.getAll();
    expect(after.find((s) => s.id === temp.id)).toBeUndefined();
  });

  it('nie pozwala usunąć statusu systemowego', async () => {
    const all = await statusService.getAll();
    const system = all.find((s) => s.type === 'system')!;
    await expect(statusService.remove(system.id)).rejects.toThrow('403');
  });

  it('automatycznie generuje i sanitaryzuje slug z nazwy', async () => {
    const status = await statusService.create({
      name: 'Zły slug!',
      slug: 'ignorowany',
    });

    expect(status.slug).toBe('zy_slug');

    await statusService.remove(status.id);
  });
});
