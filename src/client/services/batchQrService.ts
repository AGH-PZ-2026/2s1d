import { jsonAuthHeaders } from './authHeaders';

export type QrSize = 'small' | 'medium' | 'large';

export const batchQrService = {
  async download(itemIds: number[], size: QrSize): Promise<void> {
    const response = await fetch('/api/v1/batch-qr/print', { method: 'POST', headers: jsonAuthHeaders(), body: JSON.stringify({ item_ids: itemIds, size }) });
    await ensureOk(response);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'qr_labels.pdf'; a.click();
    window.URL.revokeObjectURL(url);
  },
};

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  let detail = `Błąd serwera (${response.status})`;
  try { const data = await response.json(); if (typeof data.detail === 'string') detail = data.detail; } catch {}
  throw new Error(detail);
}
