import React, { useEffect, useRef, useState } from 'react';
import { Crosshair, MapPin } from 'lucide-react';
import L from 'leaflet';
import { useLanguage } from '../context/LanguageContext';

export const DEFAULT_MAP_CENTER: [number, number] = [23.2599, 77.4126];
export const DEFAULT_MAP_ZOOM = 12;

interface LocationPickerProps {
  latitude?: number;
  longitude?: number;
  locationName: string;
  onChange: (lat: number, lng: number, name: string) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude = DEFAULT_MAP_CENTER[0],
  longitude = DEFAULT_MAP_CENTER[1],
  locationName,
  onChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([latitude, longitude], DEFAULT_MAP_ZOOM);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);

      // Custom pulse icon for location
      const pinIcon = L.divIcon({
        className: 'custom-pin-icon',
        html: `<div style="background-color: #0284c7; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([latitude, longitude], {
        draggable: true,
        icon: pinIcon,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onChange(
          parseFloat(pos.lat.toFixed(6)),
          parseFloat(pos.lng.toFixed(6)),
          `Adjusted Location (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`
        );
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onChange(
          parseFloat(e.latlng.lat.toFixed(6)),
          parseFloat(e.latlng.lng.toFixed(6)),
          `Pinned Location (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`
        );
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      mapInstanceRef.current.setView([latitude, longitude], 15);
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      }
    }

    return () => {
      // Clean up map instance on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update view when coordinates change from outside
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
      mapInstanceRef.current.panTo([latitude, longitude]);
    }
  }, [latitude, longitude]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy);
        setGpsLoading(false);
        onChange(
          lat,
          lng,
          `Citizen GPS Location (±${accuracy}m accuracy)`
        );
      },
      () => {
        setGpsLoading(false);
        setGpsError('Location access is unavailable. Adjust the location on the map.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const { t } = useLanguage();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
          <MapPin size={14} className="text-sky-600 dark:text-sky-400" />
          {t('location.picker_title', 'Location & Coordinates')}
        </label>
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={gpsLoading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 px-2.5 py-1 rounded-md transition-colors disabled:opacity-60 cursor-pointer"
        >
          <Crosshair size={13} className={gpsLoading ? 'animate-spin' : ''} />
          {gpsLoading ? t('location.locating', 'Locating...') : t('location.use_my_location', 'Use My Location')}
        </button>
      </div>

      {gpsError && (
        <div className="p-2 text-xs bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-md">
          {gpsError}
        </div>
      )}

      {/* Mini Leaflet Map */}
      <div className="h-48 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 relative shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" />
        <div className="absolute bottom-2 left-2 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs text-[10px] text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded shadow-xs border border-slate-200 dark:border-slate-700">
          {t('location.drag_hint', 'Drag pin or click map to adjust')}
        </div>
      </div>

      {/* Location label input */}
      <div>
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
          {t('location.desc_label', 'Location Description / Landmark')}
        </label>
        <input
          type="text"
          value={locationName}
          onChange={(e) => onChange(latitude, longitude, e.target.value)}
          placeholder="e.g. Near MP Nagar Zone 1, Bhopal"
          className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          {t('location.coords', 'Coordinates')}: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      </div>
    </div>
  );
};
