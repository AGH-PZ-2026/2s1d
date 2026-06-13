import { useState, useEffect, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
import LeafletMap from '../components/LeafletMap';
import { itemService, type CreateLocationPayload } from '../services/itemService';
import { itemPhotoService, type ItemPhoto } from '../services/itemPhotoService';
import { delegationService } from '../services/delegationService';
import { useAuth } from '../hooks/useAuth';
import type { Item, CreateItemPayload } from '../types/item';
import type { Category } from '../types/category';
import type { Group } from '../types/group';
import type { Location } from '../types/location';
import type { Owner } from '../types/owner';
import type { Status } from '../types/status';
import type { Delegation } from '../types/delegation';

interface ModalState { mode: 'create'; }

type SortKey = 'name' | 'manufacturer' | 'model' | 'serial' | 'category' | 'status' | 'location';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 5;

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [photos, setPhotos] = useState<ItemPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [filters, setFilters] = useState({ query: '', categoryId: '', statusId: '', locationId: '', ownerId: '', manufacturer: '' });
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);
  
  const { user } = useAuth();
  const [itemDelegations, setItemDelegations] = useState<Delegation[]>([]);

  const fetchItems = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [itemsData, categoriesData, locationsData, ownersData, groupsData, statusesData] = await Promise.all([
        itemService.getAll(), itemService.getCategories(), itemService.getLocations(), itemService.getOwners(), itemService.getGroups(), itemService.getStatuses(),
      ]);
      setItems(itemsData); setCategories(categoriesData); setLocations(locationsData); setOwners(ownersData); setGroups(groupsData); setStatuses(statusesData);
    } catch { setError('Nie udało się pobrać przedmiotów.'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchItems(); }, [fetchItems]);

  const handleCreate = async (payload: CreateItemPayload) => {
    setFormLoading(true); setFormError(null);
    try { await itemService.create(payload); await fetchItems(); setSuccessMessage('Przedmiot został dodany pomyślnie.'); setModal(null); }
    catch (e: unknown) { setFormError(e instanceof Error ? e.message : 'Wystąpił błąd.'); }
    finally { setFormLoading(false); }
  };

  const openCreate = () => { setFormError(null); setModal({ mode: 'create' }); };

  const getCategoryName = useCallback((id: number) => categories.find((c) => c.id === id)?.name ?? '—', [categories]);
  const getStatusName = useCallback((id: number) => statuses.find((s) => s.id === id)?.name ?? '—', [statuses]);
  const getLocationName = useCallback((id: number) => locations.find((l) => l.id === id)?.name ?? '—', [locations]);
  const getOwnerName = useCallback((item: Item) => item.ownerGroupId ? `Grupa: ${groups.find((group) => group.id === item.ownerGroupId)?.name ?? item.ownerGroupId}` : owners.find((o) => o.id === item.ownerId)?.fullName ?? '—', [groups, owners]);

  const filteredItems = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    const manufacturer = filters.manufacturer.trim().toLowerCase();
    const visible = items.filter((item) => {
      const matchesQuery = !query || item.name.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query) || item.serial?.toLowerCase().includes(query) || item.inventoryNumber?.toLowerCase().includes(query) || item.model?.toLowerCase().includes(query);
      const matchesManufacturer = !manufacturer || item.manufacturer.toLowerCase().includes(manufacturer);
      const matchesCategory = !filters.categoryId || item.categoryId === Number(filters.categoryId);
      const matchesStatus = !filters.statusId || item.statusId === Number(filters.statusId);
      const matchesLocation = !filters.locationId || item.locationId === Number(filters.locationId);
      const matchesOwner = !filters.ownerId || item.ownerId === Number(filters.ownerId);
      return matchesQuery && matchesManufacturer && matchesCategory && matchesStatus && matchesLocation && matchesOwner;
    });
    return [...visible].sort((a, b) => {
      const aValue = sortValue(a, sort.key, { getCategoryName, getStatusName, getLocationName });
      const bValue = sortValue(b, sort.key, { getCategoryName, getStatusName, getLocationName });
      const result = aValue.localeCompare(bValue, 'pl');
      return sort.direction === 'asc' ? result : -result;
    });
  }, [filters, getCategoryName, getLocationName, getStatusName, items, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = filteredItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedItem = filteredItems.find((item) => item.id === selectedItemId) ?? filteredItems[0] ?? items[0];
  const selectedLocation = selectedItem ? locations.find((location) => location.id === selectedItem.locationId) : undefined;

  useEffect(() => {
    async function loadPhotos(itemId: number) { setPhotoError(null); setPhotoLoading(true); try { setPhotos(await itemPhotoService.list(itemId)); } catch { setPhotoError('Nie udało się pobrać historii zdjęć.'); } finally { setPhotoLoading(false); } }
    async function loadDelegations(itemId: number) { try { setItemDelegations(await delegationService.getAll(itemId)); } catch { setItemDelegations([]); } }
    if (selectedItem) {
      void loadPhotos(selectedItem.id);
      void loadDelegations(selectedItem.id);
    }
  }, [selectedItem]);

  const canEditSelected = useMemo(() => {
    if (!selectedItem || !user) return false;
    if (user.role === 'admin') return true;
    if (selectedItem.ownerId === user.id) return true;
    const hasDelegation = itemDelegations.some(d => d.user_id === user.id && (d.permission === 'edit' || d.permission === 'manage'));
    if (hasDelegation) return true;
    return false;
  }, [selectedItem, user, itemDelegations]);

  const handlePhotoUpload = async (file: File) => {
    if (!selectedItem) return;
    setPhotoError(null); setPhotoLoading(true);
    try { await itemPhotoService.upload(selectedItem.id, file); setPhotos(await itemPhotoService.list(selectedItem.id)); setSuccessMessage('Zdjęcie zostało dodane.'); }
    catch (err) { setPhotoError(err instanceof Error ? err.message : 'Nie udało się dodać zdjęcia.'); }
    finally { setPhotoLoading(false); }
  };

  const handleLocationChange = async (locationId: number) => {
    if (!selectedItem) return;
    try { await itemService.updateLocation(selectedItem.id, locationId); await fetchItems(); setSuccessMessage('Lokalizacja przedmiotu została zaktualizowana.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Nie udało się zaktualizować lokalizacji.'); }
  };

  const handleCreateLocation = async (payload: CreateLocationPayload) => {
    if (!selectedItem) return;
    try { const location = await itemService.createLocation(payload); await itemService.updateLocation(selectedItem.id, location.id); await fetchItems(); setSuccessMessage('Nowy punkt lokalizacji został dodany i przypisany.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Nie udało się dodać punktu lokalizacji.'); }
  };

  return (
    <div className="page">
      <div className="page-header"><div><h1 className="page-title">Przedmioty</h1><p className="page-subtitle">Zarządzaj przedmiotami w systemie</p></div><button className="btn btn-primary" onClick={openCreate}>+ Dodaj przedmiot</button></div>
      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}
      {loading ? (<div className="loading-state"><div className="spinner" /><span>Ładowanie przedmiotów…</span></div>) : (<>
        <ItemsFilters categories={categories} filters={filters} locations={locations} onChange={(patch) => { setFilters((current) => ({ ...current, ...patch })); setPage(1); }} owners={owners} statuses={statuses} />
        <table className="table">
          <thead><tr>
            <th><SortButton active={sort.key === 'name'} direction={sort.direction} label="Nazwa" onClick={() => setSort(nextSort(sort, 'name'))} /></th>
            <th><SortButton active={sort.key === 'manufacturer'} direction={sort.direction} label="Producent" onClick={() => setSort(nextSort(sort, 'manufacturer'))} /></th>
            <th>Model</th>
            <th>Nr seryjny</th>
            <th><SortButton active={sort.key === 'category'} direction={sort.direction} label="Kategoria" onClick={() => setSort(nextSort(sort, 'category'))} /></th>
            <th><SortButton active={sort.key === 'status'} direction={sort.direction} label="Status" onClick={() => setSort(nextSort(sort, 'status'))} /></th>
            <th><SortButton active={sort.key === 'location'} direction={sort.direction} label="Lokalizacja" onClick={() => setSort(nextSort(sort, 'location'))} /></th>
            <th>Właściciel / opiekun</th>
          </tr></thead>
          <tbody>
            {paginatedItems.length === 0 ? (<tr><td colSpan={9}>Brak przedmiotów spełniających filtry.</td></tr>) : paginatedItems.map((item) => (<tr key={item.id} className={item.id === selectedItem?.id ? 'row-selected' : ''} onClick={() => setSelectedItemId(item.id)}><td className="td-name">{item.name}</td><td>{item.manufacturer}</td><td>{item.model ?? '—'}</td><td>{item.serial ?? '—'}</td><td>{getCategoryName(item.categoryId)}</td><td>{getStatusName(item.statusId)}</td><td>{getLocationName(item.locationId)}</td><td>{getOwnerName(item)}</td></tr>))}
          </tbody>
        </table>
        <div className="table-pagination"><span>Strona {currentPage} z {totalPages} · Wyniki: {filteredItems.length}</span><div className="td-actions"><button className="btn btn-secondary" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Poprzednia</button><button className="btn btn-secondary" disabled={currentPage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} type="button">Następna</button></div></div>
        {selectedItem && (<><LocationMapPanel item={selectedItem} location={selectedLocation} locations={locations} onCreateLocation={handleCreateLocation} onLocationChange={handleLocationChange} ownerName={getOwnerName(selectedItem)} statusName={getStatusName(selectedItem.statusId)} canEdit={canEditSelected} /><ItemPhotosPanel item={selectedItem} photos={photos} error={photoError} loading={photoLoading} onUpload={handlePhotoUpload} /></>)}
      </>)}
      {modal && (<div className="modal-overlay" onClick={() => setModal(null)}><div className="modal" onClick={(e) => e.stopPropagation()}><div className="modal-header"><h2>Nowy przedmiot</h2><button className="modal-close" onClick={() => setModal(null)}><X size={18} /></button></div>{formError && <div className="alert alert-error">{formError}</div>}<CreateForm categories={categories} groups={groups} locations={locations} owners={owners} statuses={statuses} onSubmit={handleCreate} loading={formLoading} /></div></div>)}
    </div>
  );
}

function ItemsFilters({ categories, filters, locations, onChange, owners, statuses }: { categories: Category[]; filters: { query: string; categoryId: string; statusId: string; locationId: string; ownerId: string; manufacturer: string; }; locations: Location[]; onChange: (patch: Partial<typeof filters>) => void; owners: Owner[]; statuses: Status[] }) {
  return (<section className="filters-panel" aria-label="Filtry przedmiotów">
    <label className="form-label" htmlFor="item-filter-query">Szukaj (nazwa, opis, model, seryjny, inwentarzowy)</label><input className="form-input" id="item-filter-query" onChange={(event) => onChange({ query: event.target.value })} placeholder="np. oscyloskop" value={filters.query} />
    <label className="form-label" htmlFor="item-filter-manufacturer">Producent</label><input className="form-input" id="item-filter-manufacturer" onChange={(event) => onChange({ manufacturer: event.target.value })} placeholder="np. Tektronix" value={filters.manufacturer} />
    <label className="form-label" htmlFor="item-filter-category">Kategoria</label><select className="form-input" id="item-filter-category" onChange={(event) => onChange({ categoryId: event.target.value })} value={filters.categoryId}><option value="">Wszystkie</option>{categories.map((category) => (<option key={category.id} value={category.id}>{category.name}</option>))}</select>
    <label className="form-label" htmlFor="item-filter-status">Status</label><select className="form-input" id="item-filter-status" onChange={(event) => onChange({ statusId: event.target.value })} value={filters.statusId}><option value="">Wszystkie</option>{statuses.map((status) => (<option key={status.id} value={status.id}>{status.name}</option>))}</select>
    <label className="form-label" htmlFor="item-filter-location">Lokalizacja</label><select className="form-input" id="item-filter-location" onChange={(event) => onChange({ locationId: event.target.value })} value={filters.locationId}><option value="">Wszystkie</option>{locations.map((location) => (<option key={location.id} value={location.id}>{location.name}</option>))}</select>
    <label className="form-label" htmlFor="item-filter-owner">Właściciel / opiekun</label><select className="form-input" id="item-filter-owner" onChange={(event) => onChange({ ownerId: event.target.value })} value={filters.ownerId}><option value="">Wszyscy</option>{owners.map((owner) => (<option key={owner.id} value={owner.id}>{owner.fullName}</option>))}</select>
  </section>);
}

function SortButton({ active, direction, label, onClick }: { active: boolean; direction: SortDirection; label: string; onClick: () => void }) {
  return (<button className="table-sort-button" onClick={onClick} type="button">{label}{active ? ` ${direction === 'asc' ? 'rosnąco' : 'malejąco'}` : ''}</button>);
}

function nextSort(current: { key: SortKey; direction: SortDirection }, key: SortKey): { key: SortKey; direction: SortDirection } { return { key, direction: (current.key === key && current.direction === 'asc' ? 'desc' : 'asc') as SortDirection }; }

function sortValue(item: Item, key: SortKey, helpers: { getCategoryName: (id: number) => string; getStatusName: (id: number) => string; getLocationName: (id: number) => string }): string {
  if (key === 'category') return helpers.getCategoryName(item.categoryId);
  if (key === 'status') return helpers.getStatusName(item.statusId);
  if (key === 'location') return helpers.getLocationName(item.locationId);
  if (key === 'model') return item.model ?? '';
  if (key === 'serial') return item.serial ?? '';
  return item[key] ?? '';
}

function LocationMapPanel({ item, location, locations, onCreateLocation, onLocationChange, ownerName, statusName, canEdit }: { item: Item; location: Location | undefined; locations: Location[]; onCreateLocation: (p: CreateLocationPayload) => void; onLocationChange: (locationId: number) => void; ownerName: string; statusName: string; canEdit: boolean }) {
  const [newLocation, setNewLocation] = useState({ name: '', kind: 'internal' as 'internal' | 'external', building: '', room: '', cabinet: '', shelf: '', mapX: '', mapY: '' });
  const [previewCoords, setPreviewCoords] = useState<{x: number, y: number} | null>(null);
  
  return (<section className="location-panel" aria-label="Mapa lokalizacji przedmiotu">
    <div className="location-panel__summary"><p className="location-panel__label">Lokalizacja przedmiotu</p><h2>{item.name}</h2><dl>
      <div><dt>Producent</dt><dd>{item.manufacturer}</dd></div>
      {item.model && <div><dt>Model</dt><dd>{item.model}</dd></div>}
      {item.serial && <div><dt>Nr seryjny</dt><dd>{item.serial}</dd></div>}
      {item.inventoryNumber && <div><dt>Nr inwentarzowy</dt><dd>{item.inventoryNumber}</dd></div>}
      {item.systemId && <div><dt>System ID</dt><dd>{item.systemId}</dd></div>}
      <div><dt>Status</dt><dd>{statusName}</dd></div>
      <div><dt>Opiekun</dt><dd>{ownerName}</dd></div>
      <div><dt>Punkt</dt><dd>{location?.name ?? 'Brak przypisanej lokalizacji'}</dd></div>
      <div><dt>Szczegóły</dt><dd>{formatLocationDetails(location)}</dd></div>
    </dl></div>
    <div className="location-map-container" style={{ marginBottom: '1rem' }}>
      <LeafletMap 
        mapX={location?.mapX} 
        mapY={location?.mapY} 
        previewX={previewCoords?.x}
        previewY={previewCoords?.y}
        onLocationSelect={canEdit ? ((x, y) => {
          setPreviewCoords({x, y});
          setNewLocation(current => ({ ...current, mapX: x.toFixed(6), mapY: y.toFixed(6) }));
        }) : undefined}
      />
    </div>
    {canEdit ? (
      <div className="location-controls">
        <div className="form"><label className="form-label" htmlFor="item-location-select">Zmień lokalizację</label><select className="form-input" id="item-location-select" onChange={(event) => {
          onLocationChange(Number(event.target.value));
          setPreviewCoords(null);
        }} value={item.locationId}>{locations.map((currentLocation) => (<option key={currentLocation.id} value={currentLocation.id}>{currentLocation.name}</option>))}</select></div>
        <div className="form"><label className="form-label" htmlFor="new-location-name">Nowy punkt na mapie (kliknij na mapie by wybrać współrzędne)</label><input className="form-input" id="new-location-name" onChange={(event) => setNewLocation((current) => ({ ...current, name: event.target.value }))} placeholder="np. D-17 / 102 / Szafa B" value={newLocation.name} /><div className="location-controls__grid"><select aria-label="Typ lokalizacji" className="form-input" onChange={(event) => setNewLocation((current) => ({ ...current, kind: event.target.value as 'internal' | 'external' }))} value={newLocation.kind}><option value="internal">Wewnętrzna</option><option value="external">Zewnętrzna</option></select><input aria-label="Budynek" className="form-input" onChange={(event) => setNewLocation((current) => ({ ...current, building: event.target.value }))} placeholder="Budynek" value={newLocation.building} /><input aria-label="Pokój" className="form-input" onChange={(event) => setNewLocation((current) => ({ ...current, room: event.target.value }))} placeholder="Pokój" value={newLocation.room} /><input aria-label="Szafa" className="form-input" onChange={(event) => setNewLocation((current) => ({ ...current, cabinet: event.target.value }))} placeholder="Szafa" value={newLocation.cabinet} /><input aria-label="Półka" className="form-input" onChange={(event) => setNewLocation((current) => ({ ...current, shelf: event.target.value }))} placeholder="Półka" value={newLocation.shelf} /><input aria-label="mapX (długość geo.)" className="form-input" onChange={(event) => {
          setNewLocation((current) => ({ ...current, mapX: event.target.value }));
          const val = parseFloat(event.target.value);
          if (!isNaN(val)) setPreviewCoords(prev => ({ x: val, y: prev?.y ?? 50.0646 }));
        }} type="number" step="any" value={newLocation.mapX} /><input aria-label="mapY (szerokość geo.)" className="form-input" onChange={(event) => {
          setNewLocation((current) => ({ ...current, mapY: event.target.value }));
          const val = parseFloat(event.target.value);
          if (!isNaN(val)) setPreviewCoords(prev => ({ x: prev?.x ?? 19.9236, y: val }));
        }} type="number" step="any" value={newLocation.mapY} /></div><button className="btn btn-secondary" disabled={!newLocation.name.trim()} onClick={() => {
          onCreateLocation({ name: newLocation.name.trim(), kind: newLocation.kind, building: newLocation.building.trim() || undefined, room: newLocation.room.trim() || undefined, cabinet: newLocation.cabinet.trim() || undefined, shelf: newLocation.shelf.trim() || undefined, mapX: Number(newLocation.mapX), mapY: Number(newLocation.mapY) });
          setPreviewCoords(null);
          setNewLocation({ name: '', kind: 'internal', building: '', room: '', cabinet: '', shelf: '', mapX: '', mapY: '' });
        }} type="button">Dodaj punkt i przypisz</button></div>
      </div>
    ) : (
      <div className="alert alert-info" style={{ marginTop: '1rem' }}>Nie masz uprawnień do zmiany lokalizacji tego przedmiotu.</div>
    )}
  </section>);
}

function formatLocationDetails(location: Location | undefined): string { if (!location) return '—'; const details = [location.building, location.room, location.cabinet, location.shelf].filter(Boolean).join(' / '); return details || (location.kind === 'external' ? 'Lokalizacja zewnętrzna' : '—'); }

function ItemPhotosPanel({ item, photos: itemPhotos, error: photosError, loading: photosLoading, onUpload }: { item: Item; photos: ItemPhoto[]; error: string | null; loading: boolean; onUpload: (file: File) => void }) {
  return (<section className="photos-panel"><div><p className="location-panel__label">Dokumentacja zdjęciowa</p><h2>{item.name}</h2></div><label className="btn btn-secondary photos-upload">Dodaj zdjęcie<input accept="image/*" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = ''; }} /></label>{photosError ? <div className="alert alert-error">{photosError}</div> : null}{photosLoading ? (<div className="loading-state"><div className="spinner" />Ładowanie zdjęć...</div>) : (<table className="table photos-table"><thead><tr><th>Plik</th><th>Typ</th><th>Dodano</th><th>Użytkownik</th></tr></thead><tbody>{itemPhotos.map((photo) => (<tr key={photo.id}><td>{photo.originalFilename}</td><td>{photo.contentType}</td><td>{new Date(photo.addedAt).toLocaleString('pl-PL')}</td><td>{photo.uploadedById}</td></tr>))}</tbody></table>)}</section>);
}

function CreateForm({ categories, groups, locations, owners, statuses, onSubmit, loading }: { categories: Category[]; groups: Group[]; locations: Location[]; owners: Owner[]; statuses: Status[]; onSubmit: (p: CreateItemPayload) => void; loading: boolean }) {
  const [name, setName] = useState(''); const [manufacturer, setManufacturer] = useState(''); const [model, setModel] = useState(''); const [serial, setSerial] = useState(''); const [inventoryNumber, setInventoryNumber] = useState(''); const [description, setDescription] = useState(''); const [purchaseDate, setPurchaseDate] = useState(''); 
  const [categoryId, setCategoryId] = useState<number | ''>(categories[0]?.id ?? ''); 
  const [statusId, setStatusId] = useState<number | ''>(statuses[0]?.id ?? ''); 
  const [locationId, setLocationId] = useState<number | ''>(locations[0]?.id ?? ''); 
  const [ownerId, setOwnerId] = useState<number | ''>(owners[0]?.id ?? ''); 
  const [ownerGroupId, setOwnerGroupId] = useState('');
  
  const submit = () => { 
    if (!name.trim()) return; 
    onSubmit({ 
      name: name.trim(), 
      manufacturer: manufacturer.trim() || undefined, 
      model: model.trim() || undefined, 
      serial: serial.trim() || undefined, 
      inventoryNumber: inventoryNumber.trim() || undefined, 
      description: description.trim() || undefined, 
      purchaseDate: purchaseDate || undefined, 
      categoryId: categoryId !== '' ? categoryId : undefined, 
      statusId: statusId !== '' ? statusId : undefined, 
      locationId: locationId !== '' ? locationId : undefined, 
      ownerId: ownerId !== '' ? ownerId : undefined, 
      ownerGroupId: ownerGroupId ? Number(ownerGroupId) : undefined 
    }); 
  };
  
  return (<div className="form">
    <label className="form-label">Nazwa *</label><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Oscyloskop Tektronix" />
    <label className="form-label">Producent</label><input className="form-input" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="np. Tektronix" />
    <label className="form-label">Model</label><input className="form-input" value={model} onChange={(e) => setModel(e.target.value)} placeholder="np. TBS1102" />
    <label className="form-label">Nr seryjny</label><input className="form-input" value={serial} onChange={(e) => setSerial(e.target.value)} placeholder="np. MY52430015" />
    <label className="form-label">Nr inwentarzowy</label><input className="form-input" value={inventoryNumber} onChange={(e) => setInventoryNumber(e.target.value)} placeholder="np. W7/262" />
    <label className="form-label">Opis</label><textarea className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcjonalny opis" />
    <label className="form-label">Data zakupu</label><input type="date" className="form-input" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
    <label className="form-label">Kategoria</label><select className="form-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}><option value="">Brak</option>{categories.map((category) => (<option key={category.id} value={category.id}>{category.name}</option>))}</select>
    <label className="form-label">Status</label><select className="form-input" value={statusId} onChange={(e) => setStatusId(e.target.value ? Number(e.target.value) : '')}><option value="">Brak</option>{statuses.map((status) => (<option key={status.id} value={status.id}>{status.name}</option>))}</select>
    <label className="form-label">Lokalizacja</label><select className="form-input" value={locationId} onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : '')}><option value="">Brak</option>{locations.map((location) => (<option key={location.id} value={location.id}>{location.name}</option>))}</select>
    <label className="form-label">Właściciel / opiekun</label><select className="form-input" value={ownerId} onChange={(e) => setOwnerId(e.target.value ? Number(e.target.value) : '')}><option value="">Brak</option>{owners.map((owner) => (<option key={owner.id} value={owner.id}>{owner.fullName}</option>))}</select>
    <label className="form-label">Grupa opiekunów</label><select className="form-input" value={ownerGroupId} onChange={(e) => setOwnerGroupId(e.target.value)}><option value="">Brak grupy</option>{groups.map((group) => (<option key={group.id} value={group.id}>{group.name}</option>))}</select>
    <div className="form-actions"><button className="btn btn-primary" onClick={submit} disabled={loading || !name.trim()}>{loading ? 'Zapisywanie…' : 'Utwórz'}</button></div>
  </div>);
}
