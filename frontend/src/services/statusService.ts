/**
 * KONTRAKT API – po podłączeniu backendu zamień mock na fetch:
 *
 * GET    /api/v1/item-status/      → Status[]
 * POST   /api/v1/item-status/      → Status        body: CreateStatusPayload
 * PUT    /api/v1/item-status/:id   → Status        body: UpdateStatusPayload
 * DELETE /api/v1/item-status/:id   → 204 No Content
 *
 * Błędy walidacyjne: { detail: string } z kodem 422
 */

import type {
  Status,
  CreateStatusPayload,
  UpdateStatusPayload,
} from '../types/status';

// Konfiguracja Mocków i adresu API
const API_BASE = '/api/v1/item-status';
const API_COLLECTION = `${API_BASE}/`;
const USE_MOCKS = import.meta.env.MODE === 'test';

interface BackendStatusResponse {
  id: number;
  name: string;
  is_system: boolean;
}

// Adapter do mapowania pól backendu do struktury oczekiwanej przez frontendowy widok
const mapBackendToFrontend = (b: BackendStatusResponse): Status => ({
  id: b.id,
  name: b.name,
  // Ponieważ backend nie ma pola slug, generujemy go automatycznie na froncie
  slug: b.name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, ''),
  type: b.is_system ? 'system' : 'custom',
  description: undefined, // Backend aktualnie nie przechowuje ani nie zwraca opisu statusu
});

const makeSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

async function handleApiError(response: Response): Promise<never> {
  if (response.status === 422) {
    try {
      const errorData = await response.json();
      if (Array.isArray(errorData.detail)) {
        const messages = errorData.detail.map(
          (err: { loc: (string | number)[]; msg: string }) =>
            `${err.loc.join('.')}: ${err.msg}`
        );
        throw new Error(`Błąd walidacji: ${messages.join(', ')}`);
      }
      throw new Error(errorData.detail || 'Niepoprawne dane wejściowe.');
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error('Błąd walidacji danych po stronie backendu.', {
        cause: e,
      });
    }
  }
  throw new Error(`Błąd serwera (kod: ${response.status}).`);
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let mockStatuses: Status[] = [
  {
    id: 1,
    name: 'Dostępny',
    slug: 'available',
    type: 'system',
    description: 'Przedmiot jest dostępny do wypożyczenia',
  },
  {
    id: 2,
    name: 'Wypożyczony',
    slug: 'borrowed',
    type: 'system',
    description: 'Przedmiot jest aktualnie wypożyczony',
  },
  {
    id: 3,
    name: 'Zarezerwowany',
    slug: 'reserved',
    type: 'system',
    description: 'Przedmiot jest zarezerwowany',
  },
  {
    id: 4,
    name: 'Uszkodzony',
    slug: 'damaged',
    type: 'system',
    description: 'Przedmiot jest uszkodzony',
  },
  {
    id: 5,
    name: 'Oczekuje zatwierdzenia',
    slug: 'pending_approval',
    type: 'system',
    description: 'Przedmiot oczekuje na zatwierdzenie',
  },
  {
    id: 6,
    name: 'Zaginiony',
    slug: 'lost',
    type: 'custom',
    description: 'Przedmiot zaginął',
  },
  {
    id: 7,
    name: 'W serwisie',
    slug: 'in_service',
    type: 'custom',
    description: 'Przedmiot jest w serwisie',
  },
];

let nextId = 8;

const _fetchStatuses = (): Status[] => {
  return [...mockStatuses];
};

export const statusService = {
  async getAll(): Promise<Status[]> {
    if (USE_MOCKS) {
      await delay(100);
      return _fetchStatuses();
    }
    // Pobieranie danych przez REST API
    const response = await fetch(API_COLLECTION);
    if (!response.ok) await handleApiError(response);

    const data: BackendStatusResponse[] = await response.json();
    return data.map(mapBackendToFrontend);
  },

  async create(payload: CreateStatusPayload): Promise<Status> {
    if (USE_MOCKS) {
      await delay(300);

      const nameExists = mockStatuses.some((s) => s.name === payload.name);
      if (nameExists) throw new Error('Status with this name already exists');
      const newStatus: Status = {
        id: nextId++,
        name: payload.name,
        slug: makeSlug(payload.name),
        type: 'custom',
        description: payload.description,
      };
      mockStatuses = [...mockStatuses, newStatus];
      return newStatus;
    }
    const backendPayload = { name: payload.name };

    const response = await fetch(API_COLLECTION, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
    });

    if (!response.ok) await handleApiError(response);
    const data: BackendStatusResponse = await response.json();
    return mapBackendToFrontend(data);
  },

  async update(id: number, payload: UpdateStatusPayload): Promise<Status> {
    if (USE_MOCKS) {
      await delay(300);
      const status = mockStatuses.find((s) => s.id === id);
      if (!status) throw new Error('Status nie istnieje.');
      if (status.type === 'system') throw new Error('403');
      const updated = {
        ...status,
        ...payload,
        slug: payload.name ? makeSlug(payload.name) : status.slug,
      };
      mockStatuses = mockStatuses.map((s) => (s.id === id ? updated : s));
      return updated;
    }
    // Zgodnie z backendowym schematem ItemStatusUpdate, przekazujemy wyłącznie modyfikowane pole 'name'
    const backendPayload = { name: payload.name };

    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
    });

    if (!response.ok) await handleApiError(response);
    const data: BackendStatusResponse = await response.json();
    return mapBackendToFrontend(data);
  },

  async remove(id: number): Promise<void> {
    if (USE_MOCKS) {
      await delay(300);
      const status = mockStatuses.find((s) => s.id === id);
      if (!status) throw new Error('Status nie istnieje.');
      if (status.type === 'system') throw new Error('403');
      mockStatuses = mockStatuses.filter((s) => s.id !== id);
      return;
    }
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) await handleApiError(response);
  },
};
