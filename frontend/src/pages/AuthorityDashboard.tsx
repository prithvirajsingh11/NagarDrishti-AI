import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  CheckCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Flame,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingUp,
  RotateCcw,
  X,
} from 'lucide-react';
import L from 'leaflet';
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
  ComplaintStatus,
  DashboardStatistics,
  Department,
  HotspotInfo,
} from '../types/complaint';
import {
  getComplaints,
  getDashboardStatistics,
  getDepartments,
  resetDemoDataset,
  updateComplaintStatus,
} from '../services/api';
import { ProblemIcon, getProblemLabel } from '../components/ProblemIcon';
import { SeverityBadge } from '../components/SeverityBadge';

type MapMode = 'markers' | 'clusters' | 'heatmap';
type SortField = 'created_at' | 'severity' | 'status' | 'report_id';
type SortOrder = 'asc' | 'desc';

export const AuthorityDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Master Filters
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeHotspotFilter, setActiveHotspotFilter] = useState<HotspotInfo | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Map Mode
  const [mapMode, setMapMode] = useState<MapMode>('markers');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Leaflet map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Fetch live dashboard records
  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, complaintsData, deptsData] = await Promise.all([
        getDashboardStatistics(),
        getComplaints(),
        getDepartments(),
      ]);
      setStats(statsData);
      setComplaints(complaintsData);
      setDepartments(deptsData);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load authority dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm('Reset seeded demo dataset to pristine initial state? Real user reports will be preserved.')) return;
    setLoading(true);
    try {
      await resetDemoDataset();
      await loadData();
    } catch (err) {
      console.error('Failed to reset demo dataset', err);
      alert('Failed to reset demo dataset.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered & Sorted complaints list (unified for both Map and Table)
  const filteredComplaints = useMemo(() => {
    let result = [...complaints];

    // Filter by active hotspot
    if (activeHotspotFilter && activeHotspotFilter.report_ids && activeHotspotFilter.report_ids.length > 0) {
      const idSet = new Set(activeHotspotFilter.report_ids);
      result = result.filter((c) => idSet.has(c.report_id) || idSet.has(c.id));
    }

    // Category filter
    if (categoryFilter) {
      result = result.filter((c) => c.problem_type === categoryFilter);
    }

    // Severity filter
    if (severityFilter) {
      result = result.filter((c) => c.severity === severityFilter);
    }

    // Status filter
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Department filter
    if (departmentFilter) {
      result = result.filter((c) => c.department === departmentFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date().getTime();
      const oneDay = 24 * 60 * 60 * 1000;
      result = result.filter((c) => {
        const itemTime = new Date(c.created_at).getTime();
        const diffDays = (now - itemTime) / oneDay;
        if (dateFilter === 'today') return diffDays <= 1;
        if (dateFilter === '7days') return diffDays <= 7;
        if (dateFilter === '30days') return diffDays <= 30;
        return true;
      });
    }

    // Text search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.report_id.toLowerCase().includes(q) ||
          c.location_name.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q) ||
          c.problem_type.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'severity') {
        const weights: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        comparison = (weights[a.severity] || 0) - (weights[b.severity] || 0);
      } else if (sortField === 'status') {
        const statusOrder: Record<string, number> = {
          REPORTED: 1,
          ASSIGNED: 2,
          IN_PROGRESS: 3,
          RESOLVED: 4,
        };
        comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      } else if (sortField === 'report_id') {
        comparison = a.report_id.localeCompare(b.report_id);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [
    complaints,
    activeHotspotFilter,
    categoryFilter,
    severityFilter,
    statusFilter,
    departmentFilter,
    dateFilter,
    searchQuery,
    sortField,
    sortOrder,
  ]);

  // Handle status update
  const handleStatusChange = async (complaintId: string, newStatus: ComplaintStatus) => {
    setUpdatingId(complaintId);
    try {
      const updated = await updateComplaintStatus(complaintId, newStatus);
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId || c.report_id === complaintId ? updated : c))
      );
      if (selectedComplaint && (selectedComplaint.id === complaintId || selectedComplaint.report_id === complaintId)) {
        setSelectedComplaint(updated);
      }
      // Re-fetch updated dashboard stats
      const newStats = await getDashboardStatistics();
      setStats(newStats);
    } catch (err) {
      console.error('Status update failed', err);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Inspect existing duplicate
  const handleViewDuplicate = (duplicateReportId: string) => {
    const existing = complaints.find(
      (c) => c.report_id === duplicateReportId || c.id === duplicateReportId
    );
    if (existing) {
      setSelectedComplaint(existing);
      setDrawerOpen(true);
      if (mapInstanceRef.current && existing.latitude && existing.longitude) {
        mapInstanceRef.current.flyTo([existing.latitude, existing.longitude], 16, { duration: 1 });
      }
    } else {
      alert(`Report ${duplicateReportId} not found in current records.`);
    }
  };

  // Focus Map on a specific hotspot
  const handleFocusHotspot = (hotspot: HotspotInfo) => {
    setActiveHotspotFilter(hotspot);
    if (mapInstanceRef.current && hotspot.latitude && hotspot.longitude) {
      mapInstanceRef.current.flyTo([hotspot.latitude, hotspot.longitude], 15, { duration: 1.2 });
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setCategoryFilter('');
    setSeverityFilter('');
    setStatusFilter('');
    setDepartmentFilter('');
    setDateFilter('all');
    setSearchQuery('');
    setActiveHotspotFilter(null);
  };

  const hasActiveFilters =
    Boolean(categoryFilter) ||
    Boolean(severityFilter) ||
    Boolean(statusFilter) ||
    Boolean(departmentFilter) ||
    dateFilter !== 'all' ||
    Boolean(searchQuery.trim()) ||
    Boolean(activeHotspotFilter);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([28.625, 77.215], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      // Map cleanup if needed on unmount
    };
  }, []);

  // Update map layer markers / clusters / heatmap whenever mode or filtered complaints change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    const bounds: L.LatLngBounds = L.latLngBounds([]);

    if (mapMode === 'markers') {
      // MODE 1: MARKER MODE (Accessible distinct symbols + colors + badges)
      filteredComplaints.forEach((c) => {
        if (!c.latitude || !c.longitude) return;
        const latLng = L.latLng(c.latitude, c.longitude);
        bounds.extend(latLng);

        // Visual distinction configuration
        let bgHex = '#059669'; // Low
        let iconSymbol = '✓';
        let shapeStyle = 'border-radius: 50%;';
        let pulseHtml = '';

        if (c.severity === 'CRITICAL') {
          bgHex = '#e11d48';
          iconSymbol = '!';
          shapeStyle = 'border-radius: 8px;';
          pulseHtml = `<span style="position: absolute; inset: -4px; border-radius: 12px; background: rgba(225, 29, 72, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`;
        } else if (c.severity === 'HIGH') {
          bgHex = '#ea580c';
          iconSymbol = '▲';
          shapeStyle = 'border-radius: 50%;';
        } else if (c.severity === 'MEDIUM') {
          bgHex = '#d97706';
          iconSymbol = '●';
          shapeStyle = 'border-radius: 50%;';
        }

        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
              ${pulseHtml}
              <div style="
                position: relative;
                background-color: ${bgHex};
                width: 30px;
                height: 30px;
                ${shapeStyle}
                border: 2.5px solid white;
                box-shadow: 0 4px 10px rgba(0,0,0,0.35);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                color: white;
                font-family: system-ui, -apple-system, sans-serif;
                cursor: pointer;
              ">
                <span style="font-size: 11px; font-weight: 900; line-height: 1;">${iconSymbol}</span>
                <span style="font-size: 8px; font-weight: 700; text-transform: uppercase; line-height: 1;">${c.problem_type[0]}</span>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker(latLng, { icon: customIcon });
        marker.on('click', () => {
          setSelectedComplaint(c);
          setDrawerOpen(true);
        });

        marker.bindTooltip(
          `<b>${c.report_id}</b> • ${getProblemLabel(c.problem_type)}<br/><span style="font-size: 10px;">Severity: <b>${c.severity}</b> | Status: <b>${c.status}</b></span>`,
          { direction: 'top', offset: [0, -14] }
        );

        marker.addTo(markersLayerRef.current!);
      });
    } else if (mapMode === 'clusters') {
      // MODE 2: CLUSTER MODE (Spatial grouping of nearby points ~600m)
      const clusterMap: Record<
        string,
        {
          lat: number;
          lng: number;
          count: number;
          highCritical: number;
          reports: Complaint[];
        }
      > = {};

      filteredComplaints.forEach((c) => {
        if (!c.latitude || !c.longitude) return;
        // Group by ~0.007 deg lat/lng (~700m radius)
        const key = `${c.latitude.toFixed(2)}_${c.longitude.toFixed(2)}`;
        if (!clusterMap[key]) {
          clusterMap[key] = {
            lat: c.latitude,
            lng: c.longitude,
            count: 0,
            highCritical: 0,
            reports: [],
          };
        }
        clusterMap[key].count += 1;
        if (c.severity === 'CRITICAL' || c.severity === 'HIGH') {
          clusterMap[key].highCritical += 1;
        }
        clusterMap[key].reports.push(c);
      });

      Object.values(clusterMap).forEach((cluster) => {
        const latLng = L.latLng(cluster.lat, cluster.lng);
        bounds.extend(latLng);

        const isUrgent = cluster.highCritical > 0;
        const clusterBg = isUrgent ? '#e11d48' : '#0284c7';
        const diameter = Math.min(60, 36 + cluster.count * 5);

        const clusterIcon = L.divIcon({
          className: 'custom-cluster-icon',
          html: `
            <div style="
              background: ${clusterBg};
              width: ${diameter}px;
              height: ${diameter}px;
              border-radius: 50%;
              border: 3px solid white;
              box-shadow: 0 4px 12px rgba(0,0,0,0.35);
              color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: system-ui, -apple-system, sans-serif;
              font-weight: 800;
              cursor: pointer;
            ">
              <span style="font-size: 13px; line-height: 1;">${cluster.count}</span>
              <span style="font-size: 8px; opacity: 0.9; text-transform: uppercase;">reports</span>
            </div>
          `,
          iconSize: [diameter, diameter],
          iconAnchor: [diameter / 2, diameter / 2],
        });

        const marker = L.marker(latLng, { icon: clusterIcon });
        marker.on('click', () => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo(latLng, 16, { duration: 0.8 });
          }
        });

        marker.bindTooltip(
          `<b>Cluster: ${cluster.count} Reports</b><br/>${cluster.highCritical} Urgent (High/Critical)<br/><span style="font-size: 10px;">Click to zoom corridor</span>`,
          { direction: 'top' }
        );

        marker.addTo(markersLayerRef.current!);
      });
    } else if (mapMode === 'heatmap') {
      // MODE 3: HEATMAP MODE (Density-weighted gradient circles)
      const radiusMap: Record<string, number> = {
        CRITICAL: 550,
        HIGH: 450,
        MEDIUM: 320,
        LOW: 220,
      };
      const colorMap: Record<string, string> = {
        CRITICAL: '#e11d48',
        HIGH: '#ea580c',
        MEDIUM: '#d97706',
        LOW: '#059669',
      };
      const opacityMap: Record<string, number> = {
        CRITICAL: 0.45,
        HIGH: 0.38,
        MEDIUM: 0.3,
        LOW: 0.22,
      };

      filteredComplaints.forEach((c) => {
        if (!c.latitude || !c.longitude) return;
        const latLng = L.latLng(c.latitude, c.longitude);
        bounds.extend(latLng);

        const circle = L.circle(latLng, {
          radius: radiusMap[c.severity] || 320,
          color: colorMap[c.severity] || '#ea580c',
          fillColor: colorMap[c.severity] || '#ea580c',
          fillOpacity: opacityMap[c.severity] || 0.3,
          weight: 1,
        });

        circle.bindPopup(`
          <div style="font-family: system-ui; font-size: 12px; line-height: 1.4; min-width: 140px;">
            <div style="font-weight: 800; color: #0f172a;">${c.report_id}</div>
            <div style="color: #475569;">${getProblemLabel(c.problem_type)}</div>
            <div style="margin-top: 4px; display: flex; gap: 4px;">
              <span style="font-weight: 700; color: ${colorMap[c.severity]};">${c.severity}</span>
              <span>•</span>
              <span>${c.status}</span>
            </div>
          </div>
        `);

        circle.addTo(markersLayerRef.current!);
      });
    }

    // Auto-fit bounds if reports exist
    if (filteredComplaints.length > 0 && bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [filteredComplaints, mapMode]);

  // Category chart dataset
  const categoryChartData = useMemo(() => {
    const rawCounts: Record<string, number> = {
      pothole: 0,
      garbage: 0,
      streetlight: 0,
      drain: 0,
      other: 0,
    };

    if (stats?.by_category) {
      Object.entries(stats.by_category).forEach(([k, v]) => {
        rawCounts[k.toLowerCase()] = v;
      });
    } else {
      complaints.forEach((c) => {
        rawCounts[c.problem_type] = (rawCounts[c.problem_type] || 0) + 1;
      });
    }

    return [
      { name: 'Potholes', key: 'pothole', count: rawCounts.pothole || 0, color: '#f59e0b' },
      { name: 'Garbage', key: 'garbage', count: rawCounts.garbage || 0, color: '#10b981' },
      { name: 'Streetlights', key: 'streetlight', count: rawCounts.streetlight || 0, color: '#eab308' },
      { name: 'Drainage', key: 'drain', count: rawCounts.drain || 0, color: '#06b6d4' },
      { name: 'Other', key: 'other', count: rawCounts.other || 0, color: '#64748b' },
    ];
  }, [stats, complaints]);

  // 7-day trend chart dataset
  const trendChartData = useMemo(() => {
    if (stats?.daily_trends && stats.daily_trends.length > 0) {
      return stats.daily_trends;
    }
    // Fallback if stats empty
    return [
      { date: '2026-09-20', day_label: 'Sun', count: 2 },
      { date: '2026-09-21', day_label: 'Mon', count: 4 },
      { date: '2026-09-22', day_label: 'Tue', count: 5 },
      { date: '2026-09-23', day_label: 'Wed', count: 3 },
      { date: '2026-09-24', day_label: 'Thu', count: 7 },
      { date: '2026-09-25', day_label: 'Fri', count: 8 },
      { date: '2026-09-26', day_label: 'Sat', count: 12 },
    ];
  }, [stats]);

  // Check if active view has repeated issues
  const repeatedIssueNotice = useMemo(() => {
    if (activeHotspotFilter && (activeHotspotFilter.repeated_count ?? 0) >= 2) {
      return {
        count: activeHotspotFilter.repeated_count,
        issue: activeHotspotFilter.dominant_issue,
        corridor: activeHotspotFilter.title,
      };
    }
    // Check if filtered complaints contain repeated category in same corridor
    if (filteredComplaints.length >= 3) {
      const counts: Record<string, number> = {};
      filteredComplaints.forEach((c) => {
        counts[c.problem_type] = (counts[c.problem_type] || 0) + 1;
      });
      for (const [prob, cnt] of Object.entries(counts)) {
        if (cnt >= 3) {
          return {
            count: cnt,
            issue: getProblemLabel(prob as any),
            corridor: 'Selected Operational Sector',
          };
        }
      }
    }
    return null;
  }, [activeHotspotFilter, filteredComplaints]);

  // Lifecycle steps for Drawer
  const lifecycleSteps: { status: ComplaintStatus; label: string }[] = [
    { status: 'REPORTED', label: 'Reported' },
    { status: 'ASSIGNED', label: 'Assigned' },
    { status: 'IN_PROGRESS', label: 'In Progress' },
    { status: 'RESOLVED', label: 'Resolved' },
  ];

  const getStepIndex = (status: ComplaintStatus) => {
    switch (status) {
      case 'REPORTED':
        return 0;
      case 'ASSIGNED':
        return 1;
      case 'IN_PROGRESS':
        return 2;
      case 'RESOLVED':
        return 3;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-900 pb-16">
      {/* 1. TOP HEADER / COMMAND CENTER BAR */}
      <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Building2 size={16} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  NagarDrishti AI
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-slate-400 font-normal">Command Center</span>
              </div>
              <h1 className="text-base font-bold tracking-tight text-white leading-tight">
                Municipal Authority Command Center
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="hidden sm:flex flex-col items-end text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock size={11} className="text-slate-500" />
                Synced: {lastRefreshed.toLocaleTimeString()}
              </span>
              <span className="text-slate-500 text-[10px]">Deterministic DB Aggregation</span>
            </div>

            <button
              type="button"
              onClick={handleResetDemo}
              disabled={loading}
              title="Reset seeded demo dataset to pristine initial state"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors shadow-xs cursor-pointer"
            >
              <RotateCcw size={13} />
              <span>Reset Demo</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-sky-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Syncing...' : 'Sync Data'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* 2. KPI CARDS */}
        <section aria-label="Key Performance Indicators">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Reports
              </div>
              <div className="text-3xl font-black text-slate-900 mt-1">
                {stats?.total_reports ?? complaints.length}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Ingested from citizens</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-rose-200 bg-rose-50/20 shadow-xs">
              <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <Flame size={13} className="text-rose-600" />
                High / Critical
              </div>
              <div className="text-3xl font-black text-rose-600 mt-1">
                {stats?.high_critical ?? 0}
              </div>
              <div className="text-[10px] text-rose-700/80 mt-0.5">Urgent triage required</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-blue-200 shadow-xs">
              <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                Reported / Pending
              </div>
              <div className="text-3xl font-black text-blue-600 mt-1">
                {stats?.pending ?? 0}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Awaiting assignment</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-amber-200 shadow-xs">
              <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
                In Progress
              </div>
              <div className="text-3xl font-black text-amber-600 mt-1">
                {stats?.in_progress ?? 0}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Crews dispatched</div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-xs col-span-2 sm:col-span-1">
              <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle size={13} className="text-emerald-600" />
                Resolved
              </div>
              <div className="text-3xl font-black text-emerald-600 mt-1">
                {stats?.resolved ?? 0}
              </div>
              <div className="text-[10px] text-emerald-700/80 mt-0.5">Verified resolutions</div>
            </div>
          </div>
        </section>

        {/* 3. REPEATED PROBLEM ALERT (Section 16) */}
        {repeatedIssueNotice && (
          <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-xl flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-700 rounded-lg">
                <AlertTriangle size={18} />
              </div>
              <div>
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Repeated Civic Problem Detected
                </div>
                <div className="text-xs text-amber-800 mt-0.5">
                  <span className="font-bold">{repeatedIssueNotice.count} repeated reports</span> of{' '}
                  <span className="font-semibold">{repeatedIssueNotice.issue}</span> identified
                  within the <span className="font-semibold">{repeatedIssueNotice.corridor}</span>.
                </div>
              </div>
            </div>

            {activeHotspotFilter && (
              <button
                type="button"
                onClick={() => setActiveHotspotFilter(null)}
                className="text-xs text-amber-900 hover:text-amber-700 font-bold underline shrink-0"
              >
                Reset Corridor
              </button>
            )}
          </div>
        )}

        {/* 4. DOMINANT INTERACTIVE MAP SECTION */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-sky-600" />
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Geospatial Civic Intelligence Map
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                  {filteredComplaints.length} plotted
                </span>
                {activeHotspotFilter && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold flex items-center gap-1">
                    Hotspot: {activeHotspotFilter.title}
                    <button
                      type="button"
                      onClick={() => setActiveHotspotFilter(null)}
                      className="hover:text-amber-950 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real complaint coordinates from Supabase. Toggle visual density layers below.
              </p>
            </div>

            {/* MAP MODES TOGGLE: [ Markers ] [ Clusters ] [ Heatmap ] */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto border border-slate-200">
              <button
                type="button"
                onClick={() => setMapMode('markers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mapMode === 'markers'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Markers
              </button>
              <button
                type="button"
                onClick={() => setMapMode('clusters')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mapMode === 'clusters'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Clusters
              </button>
              <button
                type="button"
                onClick={() => setMapMode('heatmap')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mapMode === 'heatmap'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Heatmap
              </button>
            </div>
          </div>

          {/* Map canvas */}
          <div className="h-[460px] w-full rounded-xl overflow-hidden border border-slate-200 relative shadow-inner">
            <div ref={mapContainerRef} className="w-full h-full" />
          </div>

          {/* Severity Legend & Marker Differences (Section 7) */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pt-1 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-bold text-slate-700">Severity Visuals:</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded bg-rose-600 text-white text-[9px] font-black flex items-center justify-center">
                  !
                </span>
                <span className="font-medium text-rose-700">Critical (Pulse)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-orange-600 text-white text-[9px] font-black flex items-center justify-center">
                  ▲
                </span>
                <span className="font-medium text-orange-700">High</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                  ●
                </span>
                <span className="font-medium text-amber-700">Medium</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">
                  ✓
                </span>
                <span className="font-medium text-emerald-700">Low</span>
              </span>
            </div>

            <div className="text-[11px] text-slate-400">
              Click any pin or cluster to open complaint dossier & take action
            </div>
          </div>
        </section>

        {/* 5. HOTSPOT INTELLIGENCE & ANALYTICS DUAL SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* TOP CIVIC HOTSPOTS (Section 14 & 15) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Flame size={17} className="text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Top Civic Hotspots
                </h3>
              </div>
              <span className="text-[10px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                Spatial Clustering
              </span>
            </div>

            {stats?.hotspots && stats.hotspots.length > 0 ? (
              <div className="space-y-2.5">
                {stats.hotspots.map((hotspot, idx) => (
                  <div
                    key={hotspot.id || idx}
                    onClick={() => handleFocusHotspot(hotspot)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      activeHotspotFilter?.id === hotspot.id
                        ? 'border-slate-900 bg-white ring-1 ring-slate-900/10'
                        : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">
                            {hotspot.title}
                          </h4>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Dominant: <span className="font-semibold text-slate-800">{hotspot.dominant_issue}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-slate-900">
                          {hotspot.total_reports} reports
                        </div>
                        <div className="text-[10px] text-rose-600 font-semibold flex items-center justify-end gap-0.5">
                          <TrendingUp size={11} />
                          +{hotspot.trend_percentage}%
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                      <span>
                        <b className="text-slate-800">{hotspot.unresolved_count}</b> Unresolved •{' '}
                        <b className="text-rose-600">{hotspot.high_critical_count}</b> Urgent
                      </span>
                      <span className="text-sky-600 font-bold hover:underline">Focus Map →</span>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-500 bg-slate-100/80 p-1.5 rounded-lg">
                      <span className="font-bold text-slate-600">Decision Support:</span>{' '}
                      {hotspot.suggested_action}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                No active hotspots calculated yet.
              </div>
            )}
          </div>

          {/* CATEGORY & TREND ANALYTICS (Section 4 & 17) */}
          <div className="lg:col-span-7 space-y-5">
            {/* Category Distribution Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Category Distribution</h3>
                </div>
                <span className="text-[11px] text-slate-500">Live Breakdown</span>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val: any) => [`${val} reports`, 'Complaints']}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 7-Day Complaint Trend Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">7-Day Civic Inflow Trend</h3>
                </div>
                <span className="text-[11px] text-slate-500">Intake by Day</span>
              </div>

              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day_label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderRadius: '8px',
                        border: 'none',
                        color: '#fff',
                        fontSize: '11px',
                      }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(val: any) => [`${val} complaints`, 'Submissions']}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#trendGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* 6. COMPLAINTS REGISTRY & UNIFIED FILTER BAR (Section 8 & 9) */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Complaints Operational Registry
              </h2>
              <p className="text-xs text-slate-500">
                Showing {filteredComplaints.length} of {complaints.length} total municipal reports.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, road, area, issue..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Unified Filter Bar (Category, Severity, Status, Department, Date) */}
          <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <SlidersHorizontal size={13} />
                <span>Command Filters</span>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold"
                >
                  Reset All Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">All Categories</option>
                  <option value="pothole">Pothole / Road Damage</option>
                  <option value="garbage">Garbage Accumulation</option>
                  <option value="streetlight">Damaged Streetlight</option>
                  <option value="drain">Overflowing Drain</option>
                  <option value="other">Other / Unclear</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Severity
                </label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">All Statuses</option>
                  <option value="REPORTED">Reported</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Department
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Time Horizon
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="7days">Past 7 Days</option>
                  <option value="30days">Past 30 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE VIEW */}
          {complaints.length === 0 ? (
            /* EMPTY STATE (Section 18) */
            <div className="py-14 text-center space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-full bg-slate-200/70 text-slate-500 flex items-center justify-center mx-auto">
                <Building2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">No civic reports yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  As citizens report urban defects through the citizen flow, photographic AI triage,
                  geographic clustering, and operational dispatch will populate here automatically.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th
                      className="py-3 px-3 cursor-pointer hover:text-slate-900"
                      onClick={() => {
                        if (sortField === 'report_id') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortField('report_id');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Report ID</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3 px-3">Problem</th>
                    <th className="py-3 px-3">Location</th>
                    <th
                      className="py-3 px-3 cursor-pointer hover:text-slate-900"
                      onClick={() => {
                        if (sortField === 'severity') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortField('severity');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Severity</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3 px-3">Department</th>
                    <th
                      className="py-3 px-3 cursor-pointer hover:text-slate-900"
                      onClick={() => {
                        if (sortField === 'status') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortField('status');
                          setSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Status</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th
                      className="py-3 px-3 cursor-pointer hover:text-slate-900"
                      onClick={() => {
                        if (sortField === 'created_at') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        else {
                          setSortField('created_at');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        No reports match the current filter selection.
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        onClick={() => {
                          setSelectedComplaint(c);
                          setDrawerOpen(true);
                        }}
                      >
                        <td className="py-3 px-3 font-mono font-bold text-sky-700">
                          <div className="flex items-center gap-1.5">
                            <span>{c.report_id}</span>
                            {c.duplicate_of && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800"
                                title={`Possible duplicate of ${c.duplicate_of}`}
                              >
                                DUP
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 font-medium text-slate-900">
                          <div className="flex items-center gap-1.5">
                            <ProblemIcon type={c.problem_type} size={14} />
                            <span>{getProblemLabel(c.problem_type)}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-slate-600 max-w-[190px] truncate">
                          {c.location_name}
                        </td>

                        <td className="py-3 px-3">
                          <SeverityBadge severity={c.severity} size="sm" />
                        </td>

                        <td className="py-3 px-3 font-medium text-slate-700">{c.department}</td>

                        <td className="py-3 px-3">
                          <select
                            value={c.status}
                            disabled={updatingId === c.id}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) =>
                              handleStatusChange(c.id, e.target.value as ComplaintStatus)
                            }
                            className="text-xs py-1 px-2 border border-slate-200 rounded-lg bg-white font-medium text-slate-800 focus:ring-1 focus:ring-sky-500 cursor-pointer"
                          >
                            <option value="REPORTED">Reported</option>
                            <option value="ASSIGNED">Assigned</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                          </select>
                        </td>

                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedComplaint(c);
                              setDrawerOpen(true);
                            }}
                            className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                            title="Inspect Complaint"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* 7. COMPLAINT DETAIL DRAWER (Section 10, 11, 12) */}
      {drawerOpen && selectedComplaint && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto flex flex-col border-l border-slate-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Complaint Dossier
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-mono text-base font-black text-sky-800">
                    {selectedComplaint.report_id}
                  </h3>
                  <SeverityBadge severity={selectedComplaint.severity} size="sm" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-5 flex-1">
              {/* Evidence: Citizen Image */}
              <div>
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Photographic Evidence
                </div>
                <div className="h-52 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative group">
                  <img
                    src={selectedComplaint.image_url}
                    alt={selectedComplaint.problem_type}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback placeholder
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <a
                    href={selectedComplaint.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] font-bold inline-flex items-center gap-1 backdrop-blur-xs"
                  >
                    <ExternalLink size={11} />
                    <span>Open High-Res</span>
                  </a>
                </div>
              </div>

              {/* DUPLICATE STATUS WARNING (Section 12) */}
              {selectedComplaint.duplicate_of && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertTriangle size={14} className="text-amber-700 shrink-0" />
                    <span>Possible Duplicate Detected</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    A similar {getProblemLabel(selectedComplaint.problem_type)} report was recently
                    submitted nearby (Report ID:{' '}
                    <span className="font-mono font-bold">{selectedComplaint.duplicate_of}</span>).
                  </p>
                  <button
                    type="button"
                    onClick={() => handleViewDuplicate(selectedComplaint.duplicate_of!)}
                    className="mt-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1 shadow-xs"
                  >
                    <span>View Existing Report</span>
                    <ExternalLink size={11} />
                  </button>
                </div>
              )}

              {/* AI Analysis Dossier */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  AI Computer Vision Analysis
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Detected Category</span>
                    <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <ProblemIcon type={selectedComplaint.problem_type} size={14} />
                      {getProblemLabel(selectedComplaint.problem_type)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Model Confidence</span>
                    <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                      {Math.round(selectedComplaint.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {selectedComplaint.evidence && selectedComplaint.evidence.length > 0 && (
                  <div>
                    <span className="text-slate-500 block text-[11px] mb-1">Visual Evidence</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedComplaint.evidence.map((ev, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[10px] font-medium"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Location & Department */}
              <div className="space-y-2 text-xs">
                <div className="flex items-start justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Location</span>
                  <span className="font-medium text-slate-800 text-right max-w-[240px]">
                    {selectedComplaint.location_name}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Coordinates</span>
                  <span className="font-mono text-slate-700 text-[11px]">
                    {selectedComplaint.latitude?.toFixed(4)}, {selectedComplaint.longitude?.toFixed(4)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Suggested Department</span>
                  <span className="font-semibold text-slate-900">{selectedComplaint.department}</span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Submitted At</span>
                  <span className="text-slate-700">
                    {new Date(selectedComplaint.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* LIFECYCLE TIMELINE (Section 10) */}
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Lifecycle Progress
                </div>

                <div className="grid grid-cols-4 gap-1 text-center">
                  {lifecycleSteps.map((step, idx) => {
                    const currentIndex = getStepIndex(selectedComplaint.status);
                    const isPassed = idx <= currentIndex;
                    const isCurrent = idx === currentIndex;

                    return (
                      <div key={step.status} className="flex flex-col items-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                            isCurrent
                              ? 'bg-slate-900 text-white ring-2 ring-slate-400'
                              : isPassed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          {isPassed ? <CheckCircle2 size={12} /> : idx + 1}
                        </div>
                        <span
                          className={`text-[10px] mt-1 font-medium ${
                            isCurrent ? 'text-slate-900 font-bold' : isPassed ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AUTHORITY STATUS CONTROL */}
              <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                    Authority Status Override
                  </label>
                  {updatingId === selectedComplaint.id && (
                    <span className="text-[10px] text-slate-400 animate-pulse">Persisting...</span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {lifecycleSteps.map((step) => {
                    const isActive = selectedComplaint.status === step.status;
                    return (
                      <button
                        key={step.status}
                        type="button"
                        disabled={updatingId === selectedComplaint.id}
                        onClick={() => handleStatusChange(selectedComplaint.id, step.status)}
                        className={`py-2 px-2.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                          isActive
                            ? 'bg-white border-white text-slate-900 font-semibold shadow-xs'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                        }`}
                      >
                        {step.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
