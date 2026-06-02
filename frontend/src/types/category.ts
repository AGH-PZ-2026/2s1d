// Kategoria glowna
export interface CategoryResponse {
  id: number;
  name: string;
  parent_id: number | null;
}

// Podkategoria
export interface CategoryTree {
  id: number;
  name: string;
  parent_id: number | null;
  children: CategoryTree[];
}

export interface CreateCategoryPayload {
  name: string;
  parent_id?: number | null;
}

export interface UpdateCategoryPayload {
  name: string;
  parent_id?: number | null;
}
