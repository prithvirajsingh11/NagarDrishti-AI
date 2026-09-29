import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Filter, Loader2, RefreshCw } from 'lucide-react';
import type { Complaint } from '../types/complaint';
import { getComplaints } from '../services/api';
import { getProblemLabel } from '../components/ProblemIcon';
import { useLanguage } from '../context/LanguageContext';

const DEFAULT_CENTER: [number, number] = [23.2599, 77.4126]; // Bhopal center

const createPinIcon = (color: string) =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="background-color: ${color}; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

export const CivicMap: React.FC<{ onReportNew?: () => void }> = ({ onReportNew }) => {
  const { t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const fetchIssues = () => {
    setLoading(true);
    getComplaints({ limit: 100 })
      .then((data) => setComplaints(data))
      .catch((err) => console.error('Failed to load map complaints', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView(DEFAULT_CENTER, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers based on data and filter
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    const filtered = complaints.filter((c) => {
      if (selectedFilter === 'all') return true;
      return c.problem_type === selectedFilter;
    });

    filtered.forEach((item) => {
      const color =
        item.problem_type === 'pothole'
          ? '#DC2626'
          : item.problem_type === 'garbage'
          ? '#059669'
          : item.problem_type === 'streetlight'
          ? '#D97706'
          : item.problem_type === 'drain'
          ? '#0284C7'
          : '#475569';

      const marker = L.marker([item.latitude, item.longitude], {
        icon: createPinIcon(color),
      });

      const popupHtml = `
        <div style="font-family: 'Inter', sans-serif; font-size: 12px; min-width: 170px; line-height: 1.4;">
          <div style="font-weight: 700; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 6px;">
            ${getProblemLabel(item.problem_type, t)}
          </div>
          ${
            item.image_url
              ? `<div style="height: 80px; width: 100%; border-radius: 6px; overflow: hidden; background: #F1F5F9; margin-bottom: 6px;"><img src="${item.image_url}" style="width: 100%; height: 100%; object-fit: cover;" /></div>`
              : ''
          }
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">
            <strong>Status:</strong> ${item.status}
          </div>
          <div style="font-size: 10px; color: #64748B;">
            ${item.location_name}
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      markersLayerRef.current?.addLayer(marker);
    });
  }, [complaints, selectedFilter, t]);

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Map Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            City Civic Map
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Geospatial visualization of citizen reports across wards and zones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={fetchIssues}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Refresh map data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* New Report Button */}
          {onReportNew && (
            <button
              type="button"
              onClick={onReportNew}
              className="px-3.5 py-1.5 bg-[#0B2545] hover:bg-[#07192f] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              + Report Issue
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
          <Filter size={12} />
          Filter:
        </span>
        {['all', 'pothole', 'garbage', 'streetlight', 'drain'].map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedFilter(type)}
            className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              selectedFilter === type
                ? 'bg-[#0B2545] text-white font-semibold'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {type === 'all' ? 'All Issues' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Leaflet Map Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs h-[520px] relative">
        {loading && complaints.length === 0 ? (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
              <span className="text-xs text-slate-500 font-medium">Loading civic incidents...</span>
            </div>
          </div>
        ) : null}

        <div ref={mapContainerRef} className="w-full h-full z-10" />
      </div>
    </div>
  );
};
