import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';

interface LeafletMapProps {
  mapX?: number | null;
  mapY?: number | null;
  onLocationSelect?: (x: number, y: number) => void;
}

function MapEvents({ onLocationSelect }: { onLocationSelect?: (x: number, y: number) => void }) {
  useMapEvents({
    click(e) {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lng, e.latlng.lat);
      }
    },
  });
  return null;
}

export default function LeafletMap({ mapX, mapY, onLocationSelect }: LeafletMapProps) {
  const defaultLat = 50.0646;
  const defaultLng = 19.9236;

  const lat = typeof mapY === 'number' ? mapY : defaultLat;
  const lng = typeof mapX === 'number' ? mapX : defaultLng;
  const hasCoordinates = typeof mapX === 'number' && typeof mapY === 'number';

  return (
    <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      <MapContainer center={[lat, lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasCoordinates && <Marker position={[lat, lng]} />}
        <MapEvents onLocationSelect={onLocationSelect} />
      </MapContainer>
    </div>
  );
}
