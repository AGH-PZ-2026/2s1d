import { authHeaders } from './authHeaders';

export interface ImportErrorDetail { row_number: number; error_message: string; }
export interface ImportReport { total_rows_processed: number; successful_rows: number; errors: ImportErrorDetail[]; }

export const excelImportService = {
  async upload(file: File): Promise<ImportReport> {
    const fd = new FormData(); fd.append('file', file);
    const response = await fetch('/api/v1/excel/upload', { method: 'POST', headers: authHeaders(), body: fd });
    await ensureOk(response); return response.json();
  },
};

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  let detail = `Błąd serwera (${response.status})`;
  try { const data = await response.json(); if (typeof data.detail === 'string') detail = data.detail; } catch {}
  throw new Error(detail);
}
