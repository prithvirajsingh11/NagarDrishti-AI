import React from 'react';
import type {
  Complaint,
  Department,
  HeatmapPoint,
  HotspotInfo,
} from '../types/complaint';
import { LeafletMap, type MapMode } from '../components/LeafletMap';
import { FilterBar } from '../components/FilterBar';

interface MapIntelligenceProps {
  complaints: Complaint[];
  heatmapPoints: HeatmapPoint[];
  departments: Department[];
  hotspots: HotspotInfo[];
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
  onSelectComplaint: (c: Complaint) => void;
  focusedHotspot: HotspotInfo | null;
  onSelectHotspot: (h: HotspotInfo | null) => void;
  // Filters
  categoryFilter: string;
  onCategoryFilterChange: (val: string) => void;
  severityFilter: string;
  onSeverityFilterChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  departmentFilter: string;
  onDepartmentFilterChange: (val: string) => void;
  dateHorizon: string;
  onDateHorizonChange: (val: string) => void;
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  onResetFilters: () => void;
}

export const MapIntelligence: React.FC<MapIntelligenceProps> = ({
  complaints,
  heatmapPoints,
  departments,
  hotspots,
  mapMode,
  onMapModeChange,
  onSelectComplaint,
  focusedHotspot,
  onSelectHotspot,
  categoryFilter,
  onCategoryFilterChange,
  severityFilter,
  onSeverityFilterChange,
  statusFilter,
  onStatusFilterChange,
  departmentFilter,
  onDepartmentFilterChange,
  dateHorizon,
  onDateHorizonChange,
  searchQuery,
  onSearchQueryChange,
  onResetFilters,
}) => {
  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      {/* Title & Hotspot quick selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-100">
            Geographic Map Intelligence
          </h2>
          <p className="text-xs text-slate-400">
            Spatial distribution, density clusters, and high-risk thermal hotspots across municipal zones.
          </p>
        </div>

        {/* Hotspot Focus Quick Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Focus Corridor:</span>
          <select
            value={focusedHotspot ? focusedHotspot.title : ''}
            onChange={(e) => {
              const selected = hotspots.find((h) => h.title === e.target.value);
              onSelectHotspot(selected || null);
            }}
            aria-label="Focus on specific corridor hotspot"
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">Full City Overview</option>
            {hotspots.map((h, i) => (
              <option key={i} value={h.title}>
                {h.title} ({h.total_reports} reports)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Bar */}
      <FilterBar
        category={categoryFilter}
        onCategoryChange={onCategoryFilterChange}
        severity={severityFilter}
        onSeverityChange={onSeverityFilterChange}
        status={statusFilter}
        onStatusChange={onStatusFilterChange}
        department={departmentFilter}
        onDepartmentChange={onDepartmentFilterChange}
        dateHorizon={dateHorizon}
        onDateHorizonChange={onDateHorizonChange}
        search={searchQuery}
        onSearchChange={onSearchQueryChange}
        departments={departments}
        onResetFilters={onResetFilters}
      />

      {/* Large Authority Map Viewport */}
      <div className="flex-1 min-h-[480px]">
        <LeafletMap
          complaints={complaints}
          heatmapPoints={heatmapPoints}
          mapMode={mapMode}
          onMapModeChange={onMapModeChange}
          onSelectComplaint={onSelectComplaint}
          focusedHotspot={focusedHotspot}
          heightClass="h-full"
        />
      </div>
    </div>
  );
};
