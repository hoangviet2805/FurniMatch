import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon in leaflet with webpack/vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
}

const MapEvents = ({ setPosition }: { setPosition: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const RecenterAutomatically = ({ lat, lng }: { lat: number, lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng]);
  return null;
}

const LocationPicker = ({ latitude, longitude, onChange }: LocationPickerProps) => {
  const [position, setPosition] = useState<L.LatLng | null>(
    latitude && longitude ? new L.LatLng(latitude, longitude) : null
  );

  const defaultCenter: L.LatLngTuple = [21.0285, 105.8542]; // Hanoi by default

  const handleSetPosition = (lat: number, lng: number) => {
    setPosition(new L.LatLng(lat, lng));
    onChange(lat, lng);
  };

  useEffect(() => {
    if (latitude && longitude && (!position || position.lat !== latitude || position.lng !== longitude)) {
      setPosition(new L.LatLng(latitude, longitude));
    }
  }, [latitude, longitude]);

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-300 relative z-0">
      <MapContainer 
        center={position ? [position.lat, position.lng] : defaultCenter} 
        zoom={position ? 15 : 6} 
        style={{ height: '100%', width: '100%', zIndex: 10 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents setPosition={handleSetPosition} />
        {position && (
          <>
            <Marker position={position} />
            <RecenterAutomatically lat={position.lat} lng={position.lng} />
          </>
        )}
      </MapContainer>
      <div className="absolute top-2 left-2 z-[400] bg-white bg-opacity-90 px-3 py-1.5 rounded-md shadow-sm text-xs font-medium text-gray-700 border border-gray-200 pointer-events-none">
        Nhấp vào bản đồ để thả ghim vị trí của bạn
      </div>
    </div>
  );
};

export default LocationPicker;
