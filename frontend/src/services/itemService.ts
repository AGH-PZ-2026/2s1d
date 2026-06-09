/**
 * KONTRAKT API – po podłączeniu backendu zamień mock na fetch:
 * Kategorie, lokalizacje, właściciele są zrobione tymczasowo.
 *
 * GET    /api/v1/items          → Item[]
 * POST   /api/v1/items          → Item        body: CreateItemPayload
 *
 * GET    /api/v1/categories     → Category[]
 * GET    /api/v1/locations      → Location[]
 * GET    /api/v1/owners         → Owner[]
 * GET    /api/v1/statuses       → Status[]
 *
 */

import type { Item, CreateItemPayload } from '../types/item';
import type { Category } from '../types/category';
import type { Location } from '../types/location';
import type { Owner } from '../types/owner';
import type { Status } from '../types/status';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let mockItems: Item[] = [
  {
    id: 1,
    name: 'Oscyloskop Tektronix TBS1102',
    manufacturer: 'Tektronix',
    description: 'Oscyloskop laboratoryjny 100MHz',
    purchaseDate: '2024-03-15',

    categoryId: 1,
    statusId: 1,
    locationId: 1,
    ownerId: 1,
  },

  {
    id: 2,
    name: 'Multimetr UNI-T UT61E',
    manufacturer: 'UNI-T',
    description: 'Cyfrowy multimetr laboratoryjny',
    purchaseDate: '2023-11-08',

    categoryId: 2,
    statusId: 2,
    locationId: 2,
    ownerId: 2,
  },

  {
    id: 3,
    name: 'Dell Precision 3580',
    manufacturer: 'Dell',
    description: 'Laptop do pracy projektowej',
    purchaseDate: '2025-01-20',

    categoryId: 3,
    statusId: 1,
    locationId: 1,
    ownerId: 1,
  },
];

let nextId = 4;

const mockCategories: Category[] = [
  { id: 1, name: 'Oscyloskop' },
  { id: 2, name: 'Multimetr' },
  { id: 3, name: 'Komputer' },
];

const mockLocations: Location[] = [
  { id: 1, name: 'Magazyn A' },
  { id: 2, name: 'Sala 101' },
];

const mockOwners: Owner[] = [
  { id: 1, fullName: 'Jan Kowalski' },
  { id: 2, fullName: 'Anna Nowak' },
];

const mockStatuses: Status[] = [
  {
    id: 1,
    name: 'Dostępny',
    slug: 'available',
    type: 'system',
  },
  {
    id: 2,
    name: 'Wypożyczony',
    slug: 'borrowed',
    type: 'system',
  },
];

const _fetchItems = (): Item[] => {
  return [...mockItems];
};

export const itemService = {
  async getAll(): Promise<Item[]> {
    await delay(100);
    return _fetchItems();
  },

  async create(payload: CreateItemPayload): Promise<Item> {
    await delay(500);

    if (!payload.name.trim()) {
      throw new Error('Nazwa przedmiotu jest wymagana.');
    }

    if (!payload.manufacturer.trim()) {
      throw new Error('Producent jest wymagany.');
    }

    const newItem: Item = {
      id: nextId++,
      ...payload,
    };

    mockItems = [...mockItems, newItem];

    return newItem;
  },

  async getCategories(): Promise<Category[]> {
    await delay(100);
    return [...mockCategories];
  },

  async getLocations(): Promise<Location[]> {
    await delay(100);
    return [...mockLocations];
  },

  async getOwners(): Promise<Owner[]> {
    await delay(100);
    return [...mockOwners];
  },

  async getStatuses(): Promise<Status[]> {
    await delay(100);
    return [...mockStatuses];
  },
};
