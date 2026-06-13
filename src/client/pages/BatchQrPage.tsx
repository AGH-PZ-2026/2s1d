import { useEffect, useState } from 'react';
import { batchQrService, type QrSize } from '../services/batchQrService';
import { itemService } from '../services/itemService';
import type { Item } from '../types/item';

export default function BatchQrPage() {
  const [items, setItems] = useState<Item[]>([]); const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => { async function load() { setError(null); setIsLoading(true); try { setItems(await itemService.getAll()); } catch { setError('Nie udało się pobrać przedmiotów.'); } finally { setIsLoading(false); } } void load(); }, []);

  function toggle(id: number) { setSelectedIds((cur) => cur.includes(id) ? cur.filter((s) => s !== id) : [...cur, id]); }
  async function download() { setError(null); setIsDownloading(true); try { await batchQrService.download(selectedIds); } catch (err) { setError(err instanceof Error ? err.message : 'Nie udało się wygenerować PDF.'); } finally { setIsDownloading(false); } }

  return (
    <section>
      <div className="page-header"><div><h1 className="page-title">Drukowanie etykiet QR</h1><p className="page-subtitle">Wybierz przedmioty, aby wygenerować zbiorczy PDF.</p></div><div className="td-actions"><button className="btn btn-primary" disabled={!selectedIds.length || isDownloading} type="button" onClick={download}>{isDownloading ? 'Generowanie...' : 'Pobierz PDF'}</button></div></div>
      {error ? <div className="alert alert-error">{error}</div> : null}
      {isLoading ? (<div className="loading-state"><div className="spinner" />Ładowanie przedmiotów...</div>) : (<table className="table"><thead><tr><th>Wybór</th><th>ID</th><th>Nazwa</th><th>Producent</th></tr></thead><tbody>{items.map((item) => (<tr key={item.id}><td><input checked={selectedIds.includes(item.id)} onChange={() => toggle(item.id)} type="checkbox" /></td><td>{item.id}</td><td>{item.name}</td><td>{item.manufacturer}</td></tr>))}</tbody></table>)}
    </section>
  );
}
