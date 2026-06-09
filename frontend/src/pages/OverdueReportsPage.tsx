import { useEffect, useState } from 'react';
import {
  borrowingReportService,
  type OverdueReportRow,
} from '../services/borrowingReportService';

export default function OverdueReportsPage() {
  const [includeAll, setIncludeAll] = useState(false);
  const [rows, setRows] = useState<OverdueReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setError(null);
      setIsLoading(true);
      try {
        setRows(await borrowingReportService.getOverdue(includeAll));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Nie udało się pobrać raportu.'
        );
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [includeAll]);

  async function downloadCsv() {
    await borrowingReportService.download(
      borrowingReportService.csvUrl(includeAll),
      'overdue.csv'
    );
  }

  async function downloadPdf() {
    await borrowingReportService.download(
      borrowingReportService.pdfUrl(includeAll),
      'overdue.pdf'
    );
  }

  return (
    <section>
      <div className="page-header">
        <div>
          <h1 className="page-title">Raport przeterminowanych wypożyczeń</h1>
          <p className="page-subtitle">
            Lista przedmiotów po planowanym terminie zwrotu z eksportem CSV i
            PDF.
          </p>
        </div>
        <div className="td-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={downloadCsv}
          >
            Pobierz CSV
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={downloadPdf}
          >
            Pobierz PDF
          </button>
        </div>
      </div>

      <label className="report-toggle">
        <input
          checked={includeAll}
          onChange={(event) => setIncludeAll(event.target.checked)}
          type="checkbox"
        />
        Pokaż wszystkie przedmioty jako administrator
      </label>

      {error ? <div className="alert alert-error">{error}</div> : null}
      {isLoading ? (
        <div className="loading-state">
          <div className="spinner" />
          Ładowanie raportu...
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Wypożyczenie</th>
              <th>Przedmiot</th>
              <th>Odbiorca</th>
              <th>Planowany zwrot</th>
              <th>Dni po terminie</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.borrowingId}>
                <td>{row.borrowingId}</td>
                <td>{row.itemName}</td>
                <td>{row.borrowerId ?? row.externalBorrower ?? '—'}</td>
                <td>
                  {new Date(row.plannedReturnAt).toLocaleDateString('pl-PL')}
                </td>
                <td>{row.daysOverdue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
