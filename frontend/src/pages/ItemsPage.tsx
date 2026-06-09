import { useState, useEffect, useCallback } from 'react';

import { itemService } from '../services/itemService';

import type { Item, CreateItemPayload } from '../types/item';

import type { Category } from '../types/category';
import type { Location } from '../types/location';
import type { Owner } from '../types/owner';
import type { Status } from '../types/status';

interface ModalState {
  mode: 'create';
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState | null>(null);

  const [formError, setFormError] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formLoading, setFormLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        itemsData,
        categoriesData,
        locationsData,
        ownersData,
        statusesData,
      ] = await Promise.all([
        itemService.getAll(),
        itemService.getCategories(),
        itemService.getLocations(),
        itemService.getOwners(),
        itemService.getStatuses(),
      ]);

      setItems(itemsData);

      setCategories(categoriesData);
      setLocations(locationsData);
      setOwners(ownersData);
      setStatuses(statusesData);
    } catch {
      setError('Nie udało się pobrać przedmiotów.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchItems();
  }, [fetchItems]);

  const handleCreate = async (payload: CreateItemPayload) => {
    setFormLoading(true);
    setFormError(null);

    try {
      await itemService.create(payload);

      await fetchItems();

      setSuccessMessage('Przedmiot został dodany pomyślnie.');

      setModal(null);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Wystąpił błąd.');
    } finally {
      setFormLoading(false);
    }
  };

  const openCreate = () => {
    setFormError(null);

    setModal({
      mode: 'create',
    });
  };

  const getCategoryName = (id: number) =>
    categories.find((c) => c.id === id)?.name ?? '—';

  const getStatusName = (id: number) =>
    statuses.find((s) => s.id === id)?.name ?? '—';
  const getLocationName = (id: number) =>
    locations.find((l) => l.id === id)?.name ?? '—';

  const getOwnerName = (id: number) =>
    owners.find((o) => o.id === id)?.fullName ?? '—';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Przedmioty</h1>

          <p className="page-subtitle">Zarządzaj przedmiotami w systemie</p>
        </div>

        <button className="btn btn-primary" onClick={openCreate}>
          + Dodaj przedmiot
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span>Ładowanie przedmiotów…</span>
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nazwa</th>
              <th>Producent</th>
              <th>Opis</th>
              <th>Kategoria</th>
              <th>Status</th>
              <th>Lokalizacja</th>
              <th>Właściciel / opiekun</th>
              <th>Data zakupu</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td className="td-name">{item.name}</td>

                <td>{item.manufacturer}</td>

                <td>{item.description ?? '—'}</td>

                <td>{getCategoryName(item.categoryId)}</td>

                <td>{getStatusName(item.statusId)}</td>

                <td>{getLocationName(item.locationId)}</td>

                <td>{getOwnerName(item.ownerId)}</td>

                <td>{item.purchaseDate ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nowy przedmiot</h2>

              <button className="modal-close" onClick={() => setModal(null)}>
                ✕
              </button>
            </div>

            {formError && <div className="alert alert-error">{formError}</div>}

            <CreateForm
              categories={categories}
              locations={locations}
              owners={owners}
              statuses={statuses}
              onSubmit={handleCreate}
              loading={formLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Formularz tworzenia ----------

function CreateForm({
  categories,
  locations,
  owners,
  statuses,
  onSubmit,
  loading,
}: {
  categories: Category[];
  locations: Location[];
  owners: Owner[];
  statuses: Status[];

  onSubmit: (p: CreateItemPayload) => void;

  loading: boolean;
}) {
  const [name, setName] = useState('');

  const [manufacturer, setManufacturer] = useState('');

  const [description, setDescription] = useState('');

  const [purchaseDate, setPurchaseDate] = useState('');

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 1);

  const [statusId, setStatusId] = useState(statuses[0]?.id ?? 1);

  const [locationId, setLocationId] = useState(locations[0]?.id ?? 1);

  const [ownerId, setOwnerId] = useState(owners[0]?.id ?? 1);

  const submit = () => {
    if (!name.trim() || !manufacturer.trim()) return;

    onSubmit({
      name: name.trim(),
      manufacturer: manufacturer.trim(),
      description: description.trim() || undefined,
      purchaseDate: purchaseDate || undefined,

      categoryId,
      statusId,
      locationId,
      ownerId,
    });
  };

  return (
    <div className="form">
      <label className="form-label">Nazwa *</label>

      <input
        className="form-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="np. Laptop Dell"
      />

      <label className="form-label">Producent *</label>

      <input
        className="form-input"
        value={manufacturer}
        onChange={(e) => setManufacturer(e.target.value)}
        placeholder="np. Dell"
      />

      <label className="form-label">Opis</label>

      <textarea
        className="form-input"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Opcjonalny opis"
      />

      <label className="form-label">Data zakupu</label>

      <input
        type="date"
        className="form-input"
        value={purchaseDate}
        onChange={(e) => setPurchaseDate(e.target.value)}
      />

      <label className="form-label">Kategoria *</label>

      <select
        className="form-input"
        value={categoryId}
        onChange={(e) => setCategoryId(Number(e.target.value))}
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      <label className="form-label">Status *</label>

      <select
        className="form-input"
        value={statusId}
        onChange={(e) => setStatusId(Number(e.target.value))}
      >
        {statuses.map((status) => (
          <option key={status.id} value={status.id}>
            {status.name}
          </option>
        ))}
      </select>

      <label className="form-label">Lokalizacja *</label>

      <select
        className="form-input"
        value={locationId}
        onChange={(e) => setLocationId(Number(e.target.value))}
      >
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>

      <label className="form-label">Właściciel / opiekun *</label>

      <select
        className="form-input"
        value={ownerId}
        onChange={(e) => setOwnerId(Number(e.target.value))}
      >
        {owners.map((owner) => (
          <option key={owner.id} value={owner.id}>
            {owner.fullName}
          </option>
        ))}
      </select>

      <div className="form-actions">
        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={loading || !name.trim() || !manufacturer.trim()}
        >
          {loading ? 'Zapisywanie…' : 'Utwórz'}
        </button>
      </div>
    </div>
  );
}
