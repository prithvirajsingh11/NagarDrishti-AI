import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Map as MapIcon,
  Flame,
  Home,
  Shield,
  RotateCcw,
} from 'lucide-react';

export type AuthorityRoute = '/' | '/dashboard' | '/reports' | '/map' | '/hotspots';

interface SidebarProps {
  currentRoute: AuthorityRoute;
  onRouteChange: (route: AuthorityRoute) => void;
  onResetDemo: () => void;
  isResettingDemo?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  onRouteChange,
  onResetDemo,
  isResettingDemo = false,
}) => {
  const navItems = [
    { route: '/' as AuthorityRoute, label: 'Portal Home', icon: Home },
    { route: '/dashboard' as AuthorityRoute, label: 'Command Center', icon: LayoutDashboard },
    { route: '/reports' as AuthorityRoute, label: 'Complaint Queue', icon: ClipboardList },
    { route: '/map' as AuthorityRoute, label: 'Map Intelligence', icon: MapIcon },
    { route: '/hotspots' as AuthorityRoute, label: 'Hotspot Intelligence', icon: Flame },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-100 text-sm leading-tight tracking-wide">
              NagarDrishti AI
            </h1>
            <p className="text-xs font-medium text-blue-400">Authority Portal</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 font-medium tracking-wider uppercase">
          Municipal Civic Intelligence
        </p>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentRoute === item.route;
          return (
            <button
              key={item.route}
              onClick={() => onRouteChange(item.route)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                isActive
                  ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Actions */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="bg-slate-900/60 rounded-lg p-3 border border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Server Sync</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            FastAPI + Supabase PostgreSQL
          </p>
        </div>

        <button
          onClick={onResetDemo}
          disabled={isResettingDemo}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors disabled:opacity-50"
          title="Resets seeded demo dataset while preserving citizen submissions"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResettingDemo ? 'animate-spin' : ''}`} />
          <span>{isResettingDemo ? 'Resetting...' : 'Reset Demo Data'}</span>
        </button>
      </div>
    </aside>
  );
};
