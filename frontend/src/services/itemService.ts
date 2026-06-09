import type { Category } from '../types/category';
import type { CreateItemPayload, Item } from '../types/item';
import type { Group } from '../types/group';
import type { Location } from '../types/location';
import type { Owner } from '../types/owner';
import type { Status } from '../types/status';
import { authHeaders, jsonAuthHeaders } from './authHeaders';

const USE_MOCKS = import.meta.env.MODE === 'test';

interface BackendItem {
  id: number;
  systemId?: string | null;
  name: string;
  manufacturer?: string | null;
  description?: string | null;
  purchaseDate?: string | null;
  categoryId?: number | null;
  statusId?: number | null;
  locationId?: number | null;
  owner_id?: number | null;
  ownerId?: number | null;
  owner_group_id?: number | null;
  ownerGroupId?: number | null;
}

interface BackendCategory {
  id: number;
  name: string;
  parent_id?: number | null;
  description?: string;
}

interface BackendLocation {
  id: number;
  name: string;
  kind?: 'internal' | 'external';
  building?: string | null;
  room?: string | null;
  cabinet?: string | null;
  shelf?: string | null;
  mapX?: number | null;
  mapY?: number | null;
}

export interface CreateLocationPayload {
  name: string;
  kind: 'internal' | 'external';
  building?: string;
  room?: string;
  cabinet?: string;
  shelf?: string;
  mapX?: number;
  mapY?: number;
}

interface BackendStatus {
  id: number;
  name: string;
  is_system: boolean;
}

interface BackendUser {
  id: number;
  email: string;
}

interface BackendGroup {
  id: number;
  name: string;
}

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
];

let nextId = 3;

const mockCategories: Category[] = [
  { id: 1, name: 'Oscyloskop', parentId: null },
  { id: 2, name: 'Multimetr', parentId: null },
];

const mockLocations: Location[] = [
  {
    id: 1,
    name: 'Magazyn A',
    kind: 'internal',
    building: 'D-17',
    mapX: 28,
    mapY: 42,
  },
  {
    id: 2,
    name: 'Sala 101',
    kind: 'internal',
    building: 'D-17',
    room: '101',
    mapX: 68,
    mapY: 30,
  },
];

const mockOwners: Owner[] = [
  { id: 1, fullName: 'jan.kowalski@agh.edu.pl' },
  { id: 2, fullName: 'anna.nowak@agh.edu.pl' },
];

const mockGroups: Group[] = [
  { id: 1, name: 'Laboratorium elektroniki' },
  { id: 2, name: 'Zespół aparatury pomiarowej' },
];

const mockStatuses: Status[] = [
  { id: 1, name: 'Dostępny', slug: 'dostpny', type: 'system' },
  { id: 2, name: 'Wypożyczony', slug: 'wypoyczony', type: 'system' },
];

export const itemService = {
  async getAll(): Promise<Item[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [...mockItems];
    }
    const response = await fetch('/api/v1/items/', { headers: authHeaders() });
    await ensureOk(response);
    const data: BackendItem[] = await response.json();
    return data.map(mapItem);
  },

  async create(payload: CreateItemPayload): Promise<Item> {
    validateItem(payload);

    if (USE_MOCKS) {
      await delay(500);
      const newItem: Item = { id: nextId++, ...payload };
      mockItems = [...mockItems, newItem];
      return newItem;
    }

    const response = await fetch('/api/v1/items/', {
      method: 'POST',
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    });
    await ensureOk(response);
    return mapItem(await response.json());
  },

  async getCategories(): Promise<Category[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [...mockCategories];
    }
    const response = await fetch('/api/v1/categories/', {
      headers: authHeaders(),
    });
    await ensureOk(response);
    const data: BackendCategory[] = await response.json();
    return data.map((category) => ({
      id: category.id,
      name: category.name,
      parentId: category.parent_id ?? null,
      description: category.description,
    }));
  },

  async getLocations(): Promise<Location[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [...mockLocations];
    }
    const response = await fetch('/api/v1/locations/', {
      headers: authHeaders(),
    });
    await ensureOk(response);
    const data: BackendLocation[] = await response.json();
    return data.map(mapLocation);
  },

  async createLocation(payload: CreateLocationPayload): Promise<Location> {
    const response = await fetch('/api/v1/locations/', {
      method: 'POST',
      headers: jsonAuthHeaders(),
      body: JSON.stringify(payload),
    });
    await ensureOk(response);
    return mapLocation(await response.json());
  },

  async updateLocation(itemId: number, locationId: number): Promise<void> {
    const response = await fetch(
      `/api/v1/items/${itemId}/location?locationId=${locationId}`,
      {
        method: 'PATCH',
        headers: authHeaders(),
      }
    );
    await ensureOk(response);
  },

  async getOwners(): Promise<Owner[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [...mockOwners];
    }
    const response = await fetch('/api/v1/auth/users', {
      headers: authHeaders(),
    });
    await ensureOk(response);
    const data: BackendUser[] = await response.json();
    return data.map((user) => ({ id: user.id, fullName: user.email }));
  },

  async getGroups(): Promise<Group[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [...mockGroups];
    }
    const response = await fetch('/api/v1/groups/', {
      headers: authHeaders(),
    });
    await ensureOk(response);
    const data: BackendGroup[] = await response.json();
    return data.map((group) => ({ id: group.id, name: group.name }));
  },

  async getStatuses(): Promise<Status[]> {
    if (USE_MOCKS) {
      await delay(100);
      return [...mockStatuses];
    }
    const response = await fetch('/api/v1/item-status/', {
      headers: authHeaders(),
    });
    await ensureOk(response);
    const data: BackendStatus[] = await response.json();
    return data.map((status) => ({
      id: status.id,
      name: status.name,
      slug: slugify(status.name),
      type: status.is_system ? 'system' : 'custom',
    }));
  },
};

function mapLocation(location: BackendLocation): Location {
  return {
    id: location.id,
    name: location.name,
    kind: location.kind,
    building: location.building ?? undefined,
    room: location.room ?? undefined,
    cabinet: location.cabinet ?? undefined,
    shelf: location.shelf ?? undefined,
    mapX: location.mapX ?? undefined,
    mapY: location.mapY ?? undefined,
  };
}

function validateItem(payload: CreateItemPayload): void {
  if (!payload.name.trim()) throw new Error('Nazwa przedmiotu jest wymagana.');
  if (!payload.manufacturer.trim()) throw new Error('Producent jest wymagany.');
}

function mapItem(item: BackendItem): Item {
  return {
    id: item.id,
    name: item.name,
    manufacturer: item.manufacturer ?? '',
    description: item.description ?? undefined,
    purchaseDate: item.purchaseDate ?? undefined,
    categoryId: item.categoryId ?? 0,
    statusId: item.statusId ?? 0,
    locationId: item.locationId ?? 0,
    ownerId: item.ownerId ?? item.owner_id ?? 0,
    ownerGroupId: item.ownerGroupId ?? item.owner_group_id ?? undefined,
  };
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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}
