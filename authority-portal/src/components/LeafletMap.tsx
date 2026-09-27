import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { Complaint, HeatmapPoint, HotspotInfo } from '../types/complaint';

export type MapMode = 'markers' | 'clusters' | 'heatmap';

interface LeafletMapProps {
  complaints: Complaint[];
  heatmapPoints?: HeatmapPoint[];
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
  onSelectComplaint: (complaint: Complaint) => void;
  focusedHotspot?: HotspotInfo | null;
  heightClass?: string;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  complaints,
  heatmapPoints = [],
  mapMode,
  onMapModeChange,
  onSelectComplaint,
  focusedHotspot,
  heightClass = 'h-[460px]',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map Once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = [28.6315, 77.2167]; // Connaught Place, New Delhi
    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 12,
      zoomControl: true,
    });

    // Dark-themed tile layer (CartoDB Dark Matter)
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerGroupRef.current = layerGroup;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update map layers based on mode and complaints
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;
    const map = mapRef.current;
    const group = layerGroupRef.current;
    group.clearLayers();

    const getSeverityColor = (sev: string): string => {
      switch (sev?.toUpperCase()) {
        case 'CRITICAL':
          return '#ef4444';
        case 'HIGH':
          return '#f97316';
        case 'MEDIUM':
          return '#f59e0b';
        case 'LOW':
        default:
          return '#38bdf8';
      }
    };

    if (mapMode === 'markers') {
      // Standard pinpoint markers
      complaints.forEach((c) => {
        if (!c.latitude || !c.longitude) return;

        const color = getSeverityColor(c.severity);
        const marker = L.circleMarker([c.latitude, c.longitude], {
          radius: 8,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 0.95,
          fillOpacity: 0.85,
        });

        // Popup with thumbnail & metadata
        const popupContent = document.createElement('div');
        popupContent.className = 'text-xs space-y-1.5 p-1 font-sans text-slate-900';
        popupContent.innerHTML = `
          <div style="font-weight: 700; font-family: monospace; color: #1e293b;">${c.report_id}</div>
          <div style="font-size: 11px; color: #475569;">${c.location_name}</div>
          <div style="display: flex; gap: 4px; margin-top: 4px;">
            <span style="background: ${color}20; color: ${color}; border: 1px solid ${color}40; padding: 1px 6px; border-radius: 4px; font-weight: 600; font-size: 10px;">${c.severity}</span>
            <span style="background: #f1f5f9; color: #334155; padding: 1px 6px; border-radius: 4px; font-size: 10px;">${c.problem_type}</span>
          </div>
        `;

        const inspectBtn = document.createElement('button');
        inspectBtn.innerText = 'Inspect Complaint →';
        inspectBtn.style.cssText =
          'display: block; width: 100%; margin-top: 8px; padding: 4px 8px; background: #2563eb; color: #fff; border-radius: 4px; font-size: 11px; font-weight: 600; border: none; cursor: pointer; text-align: center;';
        inspectBtn.onclick = () => onSelectComplaint(c);
        popupContent.appendChild(inspectBtn);

        marker.bindPopup(popupContent);
        marker.addTo(group);
      });
    } else if (mapMode === 'clusters') {
      // Deterministic grid-based spatial aggregation for cluster visualization
      const clusters: Record<
        string,
        { lat: number; lng: number; count: number; severities: string[]; reports: Complaint[] }
      > = {};

      const roundCoord = (val: number) => Math.round(val * 100) / 100;

      complaints.forEach((c) => {
        if (!c.latitude || !c.longitude) return;
        const key = `${roundCoord(c.latitude)}_${roundCoord(c.longitude)}`;
        if (!clusters[key]) {
          clusters[key] = {
            lat: c.latitude,
            lng: c.longitude,
            count: 0,
            severities: [],
            reports: [],
          };
        }
        clusters[key].count += 1;
        clusters[key].severities.push(c.severity);
        clusters[key].reports.push(c);
      });

      Object.values(clusters).forEach((cl) => {
        const hasCritical = cl.severities.includes('CRITICAL');
        const hasHigh = cl.severities.includes('HIGH');
        const color = hasCritical ? '#ef4444' : hasHigh ? '#f97316' : '#2563eb';
        const radius = Math.min(28, 12 + cl.count * 3);

        const clusterMarker = L.circleMarker([cl.lat, cl.lng], {
          radius,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          fillOpacity: 0.75,
        });

        const iconHtml = `<div style="color: white; font-weight: bold; font-size: 11px; text-align: center; line-height: ${radius * 2}px;">${cl.count}</div>`;
        const divIcon = L.divIcon({
          html: iconHtml,
          className: 'cluster-count-label',
          iconSize: [radius * 2, radius * 2],
        });

        L.marker([cl.lat, cl.lng], { icon: divIcon, interactive: false }).addTo(group);

        clusterMarker.bindPopup(`
          <div style="font-size: 12px; font-family: sans-serif;">
            <strong>Cluster Area: ${cl.count} Reports</strong>
            <p style="color: #64748b; margin-top: 4px;">Dominant Severity: ${hasCritical ? 'CRITICAL' : hasHigh ? 'HIGH' : 'STANDARD'}</p>
          </div>
        `);
        clusterMarker.addTo(group);
      });
    } else if (mapMode === 'heatmap') {
      // Density-weighted heatmap simulation
      const points = heatmapPoints.length > 0 ? heatmapPoints : complaints;
      points.forEach((p: any) => {
        const lat = p.latitude;
        const lng = p.longitude;
        if (!lat || !lng) return;

        const weight = p.weight || (p.severity === 'CRITICAL' ? 1.0 : p.severity === 'HIGH' ? 0.8 : 0.4);
        const radius = 25 * weight;
        const color = weight > 0.8 ? '#ef4444' : weight > 0.5 ? '#f97316' : '#38bdf8';

        L.circle([lat, lng], {
          radius: radius * 35,
          color: 'transparent',
          fillColor: color,
          fillOpacity: 0.35 * weight,
        }).addTo(group);

        L.circleMarker([lat, lng], {
          radius: 4,
          color: '#ffffff',
          weight: 1,
          fillColor: color,
          fillOpacity: 0.9,
        }).addTo(group);
      });
    }

    // Highlight focused hotspot corridor if provided
    if (focusedHotspot && focusedHotspot.latitude && focusedHotspot.longitude) {
      const radiusMeters = (focusedHotspot.radius_km || 1.2) * 1000;
      L.circle([focusedHotspot.latitude, focusedHotspot.longitude], {
        radius: radiusMeters,
        color: '#f59e0b',
        dashArray: '6, 6',
        weight: 2,
        fillColor: '#f59e0b',
        fillOpacity: 0.15,
      }).addTo(group);

      map.flyTo([focusedHotspot.latitude, focusedHotspot.longitude], 14, {
        duration: 1.2,
      });
    }
  }, [complaints, heatmapPoints, mapMode, focusedHotspot]);

  return (
    <div className={`relative w-full rounded-xl overflow-hidden border border-slate-800 ${heightClass}`}>
      {/* Map Mode Selector Overlay */}
      <div className="absolute top-3 right-3 z-30 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-lg p-1 flex items-center gap-1 shadow-lg">
        {(['markers', 'clusters', 'heatmap'] as MapMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => onMapModeChange(mode)}
            className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
              mapMode === mode
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-30 bg-slate-950/90 backdrop-blur border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-slate-300 flex items-center gap-3 shadow-lg">
        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
          Severity
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          Critical
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          High
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-sky-400" />
          Low
        </span>
      </div>

      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
