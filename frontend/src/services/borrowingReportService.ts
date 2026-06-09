import { authHeaders } from './authHeaders';

export interface OverdueReportRow {
  borrowingId: number;
  itemId: number;
  itemName: string;
  ownerId: number | null;
  borrowerId: number | null;
  externalBorrower: string | null;
  plannedReturnAt: string;
  daysOverdue: number;
}

export const borrowingReportService = {
  async getOverdue(includeAll: boolean): Promise<OverdueReportRow[]> {
    const response = await fetch(
      `/api/v1/borrowings/overdue${query(includeAll)}`,
      {
        headers: authHeaders(),
      }
    );
    await ensureOk(response);
    return response.json();
  },

  csvUrl(includeAll: boolean): string {
    return `/api/v1/borrowings/overdue.csv${query(includeAll)}`;
  },

  pdfUrl(includeAll: boolean): string {
    return `/api/v1/borrowings/overdue.pdf${query(includeAll)}`;
  },

  async download(url: string, filename: string): Promise<void> {
    const response = await fetch(url, { headers: authHeaders() });
    await ensureOk(response);
    const blob = await response.blob();
    const objectUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    window.URL.revokeObjectURL(objectUrl);
  },
};

function query(includeAll: boolean): string {
  return includeAll ? '?includeAll=true' : '';
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
