import { authHeaders } from './authHeaders';

export interface OverdueReportRow { borrowingId: number; itemId: number; itemName: string; ownerId: number | null; borrowerId: number | null; externalBorrower: string | null; plannedReturnAt: string; daysOverdue: number; }

export const borrowingReportService = {
  async getOverdue(includeAll: boolean): Promise<OverdueReportRow[]> {
    const r = await fetch(`/api/v1/borrowings/overdue${includeAll ? '?includeAll=true' : ''}`, { headers: authHeaders() });
    await ensureOk(r); return r.json();
  },
  csvUrl(includeAll: boolean): string { return `/api/v1/borrowings/overdue.csv${includeAll ? '?includeAll=true' : ''}`; },
  pdfUrl(includeAll: boolean): string { return `/api/v1/borrowings/overdue.pdf${includeAll ? '?includeAll=true' : ''}`; },
  async download(url: string, filename: string): Promise<void> {
    const r = await fetch(url, { headers: authHeaders() }); await ensureOk(r);
    const blob = await r.blob(); const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = objectUrl; a.download = filename; a.click();
    window.URL.revokeObjectURL(objectUrl);
  },
};

async function ensureOk(response: Response): Promise<void> {
  if (response.ok) return;
  let detail = `Błąd serwera (${response.status})`;
  try { const data = await response.json(); if (typeof data.detail === 'string') detail = data.detail; } catch {}
  throw new Error(detail);
}
