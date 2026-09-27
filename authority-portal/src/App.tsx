import { useEffect, useMemo, useState } from 'react';
import type {
  Complaint,
  ComplaintStatus,
  DashboardStatistics,
  Department,
  HeatmapPoint,
  HotspotInfo,
} from './types/complaint';
import {
  getComplaints,
  getDashboardHeatmap,
  getDashboardStatistics,
  getDepartments,
  resetDemoDataset,
  updateComplaintStatus,
} from './services/api';
import { Sidebar, type AuthorityRoute } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ComplaintDrawer } from './components/ComplaintDrawer';
import { AuthorityLanding } from './pages/AuthorityLanding';
import { CommandCenter } from './pages/CommandCenter';
import { ComplaintQueue } from './pages/ComplaintQueue';
import { MapIntelligence } from './pages/MapIntelligence';
import { HotspotIntelligence } from './pages/HotspotIntelligence';
import type { MapMode } from './components/LeafletMap';

export function App() {
  // Routing state
  const [currentRoute, setCurrentRoute] = useState<AuthorityRoute>('/dashboard');

  // Backend state
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResettingDemo, setIsResettingDemo] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Master Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [dateHorizon, setDateHorizon] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map and Selection state
  const [mapMode, setMapMode] = useState<MapMode>('markers');
  const [focusedHotspot, setFocusedHotspot] = useState<HotspotInfo | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Sync routing from URL path / hash
  useEffect(() => {
    const parseRoute = (): AuthorityRoute => {
      const path = window.location.pathname;
      const hash = window.location.hash.replace('#', '');
      const target = hash ? `/${hash}` : path;

      if (target === '/dashboard' || target === '/reports' || target === '/map' || target === '/hotspots') {
        return target as AuthorityRoute;
      }
      if (target === '/' || target === '') {
        return '/';
      }
      return '/dashboard';
    };

    setCurrentRoute(parseRoute());

    const handlePopState = () => {
      setCurrentRoute(parseRoute());
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigateTo = (route: AuthorityRoute) => {
    setCurrentRoute(route);
    window.history.pushState({}, '', route);
  };

  // Fetch backend records
  const loadData = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setLoading(true);
    setIsRefreshing(true);
    try {
      const [statsData, complaintsData, heatmapData, deptsData] = await Promise.all([
        getDashboardStatistics(),
        getComplaints(),
        getDashboardHeatmap(),
        getDepartments(),
      ]);
      setStats(statsData);
      setComplaints(complaintsData);
      setHeatmapPoints(heatmapData);
      setDepartments(deptsData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load authority records', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  // Reset master filters
  const handleResetFilters = () => {
    setCategoryFilter('');
    setSeverityFilter('');
    setStatusFilter('');
    setDepartmentFilter('');
    setDateHorizon('all');
    setSearchQuery('');
    setFocusedHotspot(null);
  };

  // Filter complaints based on master criteria
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // Category
      if (categoryFilter && c.problem_type.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }
      // Severity
      if (severityFilter && c.severity.toUpperCase() !== severityFilter.toUpperCase()) {
        return false;
      }
      // Status
      if (statusFilter && c.status.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      // Department
      if (departmentFilter && c.department !== departmentFilter) {
        return false;
      }
      // Date Horizon
      if (dateHorizon !== 'all') {
        const itemDate = new Date(c.created_at).getTime();
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        if (dateHorizon === 'today' && now - itemDate > oneDay) {
          return false;
        }
        if (dateHorizon === '7d' && now - itemDate > 7 * oneDay) {
          return false;
        }
        if (dateHorizon === '30d' && now - itemDate > 30 * oneDay) {
          return false;
        }
      }
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchId = c.report_id.toLowerCase().includes(query);
        const matchLoc = (c.location_name || '').toLowerCase().includes(query);
        const matchDesc = (c.description || '').toLowerCase().includes(query);
        const matchDept = (c.department || '').toLowerCase().includes(query);
        if (!matchId && !matchLoc && !matchDesc && !matchDept) {
          return false;
        }
      }
      return true;
    });
  }, [complaints, categoryFilter, severityFilter, statusFilter, departmentFilter, dateHorizon, searchQuery]);

  // Update status action handler
  const handleUpdateStatus = async (id: string, newStatus: ComplaintStatus) => {
    const updated = await updateComplaintStatus(id, newStatus);
    // Update local complaint state immediately
    setComplaints((prev) => prev.map((item) => (item.id === id ? updated : item)));
    if (selectedComplaint && selectedComplaint.id === id) {
      setSelectedComplaint(updated);
    }
    // Re-sync dashboard statistics in background
    getDashboardStatistics().then((s) => setStats(s)).catch(() => {});
  };

  // Handle Jump to Duplicate Original
  const handleSelectDuplicate = (duplicateReportId: string) => {
    const found = complaints.find(
      (c) => c.report_id === duplicateReportId || c.id === duplicateReportId
    );
    if (found) {
      setSelectedComplaint(found);
    }
  };

  // Reset Demo Dataset handler
  const handleResetDemo = async () => {
    if (isResettingDemo) return;
    const confirmReset = window.confirm(
      'Reset seeded demo dataset? Citizen submissions will be preserved.'
    );
    if (!confirmReset) return;

    setIsResettingDemo(true);
    try {
      await resetDemoDataset();
      await loadData(false);
      handleResetFilters();
    } catch (err: any) {
      alert(`Reset failed: ${err.message || err}`);
    } finally {
      setIsResettingDemo(false);
    }
  };

  const getPageTitle = (route: AuthorityRoute) => {
    switch (route) {
      case '/':
        return 'Portal Overview';
      case '/dashboard':
        return 'Command Center';
      case '/reports':
        return 'Complaint Queue';
      case '/map':
        return 'Map Intelligence';
      case '/hotspots':
        return 'Hotspot Intelligence';
      default:
        return 'Authority Portal';
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentRoute={currentRoute}
        onRouteChange={navigateTo}
        onResetDemo={handleResetDemo}
        isResettingDemo={isResettingDemo}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900/60 overflow-y-auto">
        {/* Top Navbar */}
        <Navbar
          title={getPageTitle(currentRoute)}
          subtitle="Municipal Civic Intelligence"
          onRefresh={() => loadData(false)}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
        />

        {/* Route Pages */}
        <main className="flex-1">
          {currentRoute === '/' && (
            <AuthorityLanding
              onOpenDashboard={() => navigateTo('/dashboard')}
              stats={stats}
            />
          )}

          {currentRoute === '/dashboard' && (
            <CommandCenter
              stats={stats}
              complaints={filteredComplaints}
              heatmapPoints={heatmapPoints}
              departments={departments}
              loading={loading}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
              onSelectHotspot={(h) => {
                setFocusedHotspot(h);
                navigateTo('/map');
              }}
              focusedHotspot={focusedHotspot}
              mapMode={mapMode}
              onMapModeChange={setMapMode}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              severityFilter={severityFilter}
              onSeverityFilterChange={setSeverityFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              departmentFilter={departmentFilter}
              onDepartmentFilterChange={setDepartmentFilter}
              dateHorizon={dateHorizon}
              onDateHorizonChange={setDateHorizon}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onResetFilters={handleResetFilters}
              onNavigateToReports={() => navigateTo('/reports')}
              onNavigateToHotspots={() => navigateTo('/hotspots')}
            />
          )}

          {currentRoute === '/reports' && (
            <ComplaintQueue
              complaints={filteredComplaints}
              departments={departments}
              loading={loading}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              severityFilter={severityFilter}
              onSeverityFilterChange={setSeverityFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              departmentFilter={departmentFilter}
              onDepartmentFilterChange={setDepartmentFilter}
              dateHorizon={dateHorizon}
              onDateHorizonChange={setDateHorizon}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onResetFilters={handleResetFilters}
            />
          )}

          {currentRoute === '/map' && (
            <MapIntelligence
              complaints={filteredComplaints}
              heatmapPoints={heatmapPoints}
              departments={departments}
              hotspots={stats?.hotspots || []}
              mapMode={mapMode}
              onMapModeChange={setMapMode}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
              focusedHotspot={focusedHotspot}
              onSelectHotspot={setFocusedHotspot}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              severityFilter={severityFilter}
              onSeverityFilterChange={setSeverityFilter}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              departmentFilter={departmentFilter}
              onDepartmentFilterChange={setDepartmentFilter}
              dateHorizon={dateHorizon}
              onDateHorizonChange={setDateHorizon}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onResetFilters={handleResetFilters}
            />
          )}

          {currentRoute === '/hotspots' && (
            <HotspotIntelligence
              hotspots={stats?.hotspots || []}
              allComplaints={complaints}
              onSelectHotspot={(h) => {
                setFocusedHotspot(h);
              }}
              onNavigateToMap={() => navigateTo('/map')}
              onSelectComplaint={(c) => setSelectedComplaint(c)}
            />
          )}
        </main>
      </div>

      {/* Complaint Detail Inspection Drawer */}
      <ComplaintDrawer
        complaint={selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        onUpdateStatus={handleUpdateStatus}
        onSelectDuplicate={handleSelectDuplicate}
      />
    </div>
  );
}
export default App;
