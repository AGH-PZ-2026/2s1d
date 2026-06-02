import type {
  CategoryResponse,
  CategoryTree,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '../types/category';

const API_BASE = 'http://localhost:8000/api/v1/categories';

interface FastApiValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

async function handleApiError(response: Response): Promise<never> {
  if (response.status === 422) {
    try {
      const errorData = await response.json();
      if (Array.isArray(errorData.detail)) {
        const messages = errorData.detail.map(
          (err: FastApiValidationError) => `${err.loc.join('.')}: ${err.msg}`
        );
        throw new Error(`Błąd walidacji backendu: ${messages.join(', ')}`);
      }
      throw new Error(errorData.detail || 'Niepoprawne dane wejściowe.');
    } catch {
      throw new Error('Błąd walidacji danych.');
    }
  }
  if (response.status === 404) {
    try {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Zasób nie istnieje (404).');
    } catch {
      throw new Error('Nie znaleziono zasobu (404).');
    }
  }
  throw new Error(`Błąd serwera kategorii (kod: ${response.status}).`);
}

export const categoryService = {
  async getTree(): Promise<CategoryTree[]> {
    const response = await fetch(`${API_BASE}/tree`);
    if (!response.ok) await handleApiError(response);
    return response.json();
  },

  async create(payload: CreateCategoryPayload): Promise<CategoryResponse> {
    const response = await fetch(`${API_BASE}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) await handleApiError(response);
    return response.json();
  },

  async update(
    id: number,
    payload: UpdateCategoryPayload
  ): Promise<CategoryResponse> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) await handleApiError(response);
    return response.json();
  },

  async remove(id: number): Promise<void> {
    const response = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) await handleApiError(response);
  },
};
