import React from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  Complaint,
  DashboardStatistics,
  Department,
  HeatmapPoint,
  HotspotInfo,
} from '../types/complaint';
import { LeafletMap, type MapMode } from '../components/LeafletMap';
import { FilterBar } from '../components/FilterBar';
import { ProblemIcon, getProblemLabel } from '../components/ProblemIcon';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { RepeatedProblemBanner } from '../components/RepeatedProblemBanner';

interface CommandCenterProps {
  stats: DashboardStatistics | null;
  complaints: Complaint[];
  heatmapPoints: HeatmapPoint[];
  departments: Department[];
  loading: boolean;
  onSelectComplaint: (c: Complaint) => void;
  onSelectHotspot: (h: HotspotInfo) => void;
  focusedHotspot: HotspotInfo | null;
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
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
  onNavigateToReports: () => void;
  onNavigateToHotspots: () => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  stats,
  complaints,
  heatmapPoints,
  departments,
  loading,
  onSelectComplaint,
  onSelectHotspot,
  focusedHotspot,
  mapMode,
  onMapModeChange,
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
  onNavigateToReports,
  onNavigateToHotspots,
}) => {
  // Category chart formatting
  const categoryChartData = stats?.by_category
    ? Object.entries(stats.by_category).map(([cat, count]) => ({
        name: getProblemLabel(cat),
        count,
        key: cat,
      }))
    : [];

  const categoryColors: Record<string, string> = {
    pothole: '#f59e0b',
    garbage: '#f43f5e',
    streetlight: '#facc15',
    drain: '#38bdf8',
    other: '#94a3b8',
  };

  // 7-day trend chart formatting
  const trendData = stats?.daily_trends || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Repeated Problem Intelligence Banner */}
      {stats?.hotspots && (
        <RepeatedProblemBanner
          hotspots={stats.hotspots}
          onSelectHotspot={onSelectHotspot}
        />
      )}

      {/* 5 Live KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-medium">Total Reports</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-slate-100 mt-2">
            {stats?.total_reports ?? (loading ? '...' : 0)}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">All logged citizen reports</span>
        </div>

        <div className="bg-slate-900/90 border border-rose-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-rose-300">
            <span className="font-medium">High / Critical</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-rose-400 mt-2">
            {stats?.high_critical ?? (loading ? '...' : 0)}
          </p>
          <span className="text-[10px] text-rose-400/80 font-medium">Requires urgent crew action</span>
        </div>

        <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-amber-300">
            <span className="font-medium">Reported / Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-amber-400 mt-2">
            {stats?.pending ?? (loading ? '...' : 0)}
          </p>
          <span className="text-[10px] text-amber-400/80 font-medium">Awaiting department triage</span>
        </div>

        <div className="bg-slate-900/90 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-blue-300">
            <span className="font-medium">In Progress</span>
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-blue-400 mt-2">
            {stats?.in_progress ?? (loading ? '...' : 0)}
          </p>
          <span className="text-[10px] text-blue-400/80 font-medium">Active field work assigned</span>
        </div>

        <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span className="font-medium">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-2">
            {stats?.resolved ?? (loading ? '...' : 0)}
          </p>
          <span className="text-[10px] text-emerald-400/80 font-medium">Verified completed defects</span>
        </div>
      </div>

      {/* Synchronized Master Filter Bar */}
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

      {/* Main Map (Dominant Visual Element) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-200">
              Metropolitan Geographic Map
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({complaints.length} filtered complaints plotted)
            </span>
          </div>
          {focusedHotspot && (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
              Focused on {focusedHotspot.title}
            </span>
          )}
        </div>

        <LeafletMap
          complaints={complaints}
          heatmapPoints={heatmapPoints}
          mapMode={mapMode}
          onMapModeChange={onMapModeChange}
          onSelectComplaint={onSelectComplaint}
          focusedHotspot={focusedHotspot}
          heightClass="h-[460px]"
        />
      </div>

      {/* Split Section: Top Hotspots vs Recent Complaints */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Hotspots */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Top Geographic Hotspots
              </h3>
            </div>
            <button
              onClick={onNavigateToHotspots}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-800/80 flex-1">
            {stats?.hotspots && stats.hotspots.length > 0 ? (
              stats.hotspots.slice(0, 4).map((h, i) => (
                <div
                  key={i}
                  onClick={() => onSelectHotspot(h)}
                  className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-100">{h.title}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300 capitalize">
                        {h.dominant_issue}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {h.unresolved_count} unresolved • {h.high_critical_count} high/critical
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-amber-400">
                      {h.total_reports}
                    </span>
                    <span className="text-[10px] text-slate-400 block">reports</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                No active hotspot clusters identified.
              </p>
            )}
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200">
              Recent Complaints Queue
            </h3>
            <button
              onClick={onNavigateToReports}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              <span>Full Queue</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-800/80 flex-1">
            {complaints.length > 0 ? (
              complaints.slice(0, 4).map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectComplaint(c)}
                  className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                      <ProblemIcon type={c.problem_type} className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-200">
                          {c.report_id}
                        </span>
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-[220px]">
                        {c.location_name}
                      </p>
                    </div>
                  </div>

                  <SeverityBadge severity={c.severity} size="sm" />
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                No complaints match the filter criteria.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recharts Analytics: Category Distribution & 7-Day Inflow */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">
            Category Distribution
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={categoryColors[entry.key] || '#38bdf8'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-Day Inflow Trend */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">
            7-Day Complaint Inflow
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="day_label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#inflowGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
