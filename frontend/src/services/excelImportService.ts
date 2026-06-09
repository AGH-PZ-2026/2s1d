import { authHeaders } from './authHeaders';

export interface ImportErrorDetail {
  row_number: number;
  error_message: string;
}

export interface ImportReport {
  total_rows_processed: number;
  successful_rows: number;
  errors: ImportErrorDetail[];
}

export const excelImportService = {
  async upload(
    file: File,
    columnMapping?: Record<string, string>
  ): Promise<ImportReport> {
    const formData = new FormData();
    formData.append('file', file);
    if (columnMapping) {
      formData.append('column_mapping', JSON.stringify(columnMapping));
    }
    const response = await fetch('/api/v1/excel/upload', {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    await ensureOk(response);
    return response.json();
  },
};

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
