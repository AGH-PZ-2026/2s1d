export interface Item {
  id: number;
  name: string;
  manufacturer: string;
  description?: string;
  purchaseDate?: string;
  categoryId: number;
  statusId: number;
  locationId: number;
  ownerId: number;
}

export interface CreateItemPayload {
  name: string;
  manufacturer: string;
  description?: string;
  purchaseDate?: string;
  categoryId: number;
  statusId: number;
  locationId: number;
  ownerId: number;
}
