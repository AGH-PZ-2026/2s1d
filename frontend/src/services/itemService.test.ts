import { describe, it, expect } from 'vitest';

import { itemService } from './itemService';

describe('itemService', () => {
  it('pobiera wszystkie kategorie', async () => {
    const categories = await itemService.getCategories();

    expect(categories.length).toBeGreaterThan(0);
  });

  it('pobiera wszystkie lokalizacje', async () => {
    const locations = await itemService.getLocations();

    expect(locations.length).toBeGreaterThan(0);
  });

  it('pobiera wszystkich właścicieli', async () => {
    const owners = await itemService.getOwners();

    expect(owners.length).toBeGreaterThan(0);
  });

  it('pobiera wszystkie statusy', async () => {
    const statuses = await itemService.getStatuses();

    expect(statuses.length).toBeGreaterThan(0);
  });

  it('tworzy nowy przedmiot', async () => {
    const item = await itemService.create({
      name: 'Laptop Dell',
      manufacturer: 'Dell',
      description: 'Laptop do pracy',
      purchaseDate: '2026-05-25',

      categoryId: 1,
      statusId: 1,
      locationId: 1,
      ownerId: 1,
    });

    expect(item.name).toBe('Laptop Dell');
    expect(item.manufacturer).toBe('Dell');
  });

  it('rzuca błąd gdy nazwa jest pusta', async () => {
    await expect(
      itemService.create({
        name: '',
        manufacturer: 'Dell',

        categoryId: 1,
        statusId: 1,
        locationId: 1,
        ownerId: 1,
      })
    ).rejects.toThrow('Nazwa');
  });

  it('rzuca błąd gdy producent jest pusty', async () => {
    await expect(
      itemService.create({
        name: 'Laptop',
        manufacturer: '',

        categoryId: 1,
        statusId: 1,
        locationId: 1,
        ownerId: 1,
      })
    ).rejects.toThrow('Producent');
  });

  it('dodaje przedmiot do listy', async () => {
    const before = await itemService.getAll();

    await itemService.create({
      name: 'Monitor LG',
      manufacturer: 'LG',

      categoryId: 2,
      statusId: 1,
      locationId: 1,
      ownerId: 1,
    });

    const after = await itemService.getAll();

    expect(after.length).toBe(before.length + 1);
  });
});
