import { authHeaders } from './authHeaders';

export interface ItemPhoto {
  id: number;
  itemId: number;
  uploadedById: number;
  uploadedByName?: string;
  originalFilename: string;
  contentType: string;
  storagePath: string;
  addedAt: string;
}

export const itemPhotoService = {
  async list(itemId: number): Promise<ItemPhoto[]> {
    const response = await fetch(`/api/v1/items/${itemId}/photos/`, {
      headers: authHeaders(),
    });
    await ensureOk(response);
    const data: ItemPhoto[] = await response.json();
    return data;
  },
  async upload(itemId: number, file: File): Promise<ItemPhoto> {
    const fd = new FormData();
    fd.append('file', file);
    const response = await fetch(`/api/v1/items/${itemId}/photos/`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    await ensureOk(response);
    const data: ItemPhoto = await response.json();
    return data;
  },
};

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  let detail = `Błąd serwera (${response.status})`;
  try {
    const data: { detail?: string } = await response.json();
    if (typeof data.detail === 'string') detail = data.detail;
  } catch {}
  throw new Error(detail);
}
