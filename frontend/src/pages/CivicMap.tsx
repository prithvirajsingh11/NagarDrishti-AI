import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Filter, Loader2, RefreshCw, ShieldCheck, MapPin } from 'lucide-react';
import type { NearbyCivicIssue, ProblemType } from '../types/complaint';
import { getNearbyCivicIssues } from '../services/api';
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

  const [issues, setIssues] = useState<NearbyCivicIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const fetchIssues = useCallback(() => {
    setLoading(true);
    getNearbyCivicIssues({
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
    })
      .then((data) => setIssues(data))
      .catch((err) => console.error('Failed to load civic issues for map', err))
      .finally(() => setLoading(false));
  }, [selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

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

  // Update Markers based on data
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    issues.forEach((item) => {
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

      const statusBadgeBg =
        item.status === 'RESOLVED'
          ? '#D1FAE5; color: #065F46;'
          : item.status === 'IN_PROGRESS'
          ? '#DBEAFE; color: #1E40AF;'
          : item.status === 'REOPENED'
          ? '#FEF3C7; color: #92400E;'
          : '#F1F5F9; color: #334155;';

      const dateStr = item.created_at
        ? new Date(item.created_at).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '';

      const popupHtml = `
        <div style="font-family: 'Inter', sans-serif; font-size: 12px; min-width: 190px; line-height: 1.4; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; gap: 8px;">
            <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: #0284C7;">${item.report_id}</span>
            <span style="font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 9999px; background: ${statusBadgeBg}">${item.status.replace('_', ' ')}</span>
          </div>
          <div style="font-weight: 700; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 6px;">
            ${getProblemLabel(item.problem_type as ProblemType, t)}
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 3px; display: flex; align-items: center; gap: 4px;">
            <span>📍</span> <span>${item.location_name || 'Bhopal'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94A3B8; margin-top: 4px; border-top: 1px dashed #E2E8F0; padding-top: 4px;">
            <span>Severity: <strong style="color: #475569;">${item.severity}</strong></span>
            <span>${dateStr}</span>
          </div>
          <div style="font-size: 9.5px; color: #10B981; margin-top: 4px;">
            🛡️ Privacy Protected (Approx. Coords)
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);
      markersLayerRef.current?.addLayer(marker);
    });
  }, [issues, t]);

  return (
    <div className="space-y-4 font-sans select-none">
      {/* Map Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              City Civic Map
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck size={12} />
              Privacy Safe
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Geospatial visualization of civic reports across wards. Coordinates approximate to protect citizen privacy.
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
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
            <Filter size={12} />
            Category:
          </span>
          {['all', 'pothole', 'garbage', 'streetlight', 'drain'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedCategory(type)}
              className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                selectedCategory === type
                  ? 'bg-[#0B2545] text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {type === 'all' ? 'All Categories' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
          {['ALL', 'REPORTED', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStatus(st)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${
                selectedStatus === st
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st === 'ALL' ? 'All' : st === 'IN_PROGRESS' ? 'In Progress' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Leaflet Map Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs h-[520px] relative">
        {loading && issues.length === 0 ? (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#0B2545]" />
              <span className="text-xs text-slate-500 font-medium">Loading civic incidents...</span>
            </div>
          </div>
        ) : null}

        <div ref={mapContainerRef} className="w-full h-full z-10" />

        {/* Floating Count Badge */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/90 backdrop-blur-xs border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs text-xs font-medium text-slate-700 flex items-center gap-1.5">
          <MapPin size={13} className="text-[#0B2545]" />
          <span>{issues.length} {issues.length === 1 ? 'incident' : 'incidents'} plotted</span>
        </div>
      </div>
    </div>
  );
};

