import React from 'react';
import { Home, Camera, FileText, Map, Search, HelpCircle } from 'lucide-react';
import { MonumentIcon, IndianFlagRibbon } from './CivicEmblems';

export type NavView = 'home' | 'report' | 'my-reports' | 'map' | 'track' | 'help' | 'auth';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, className = '' }) => {
  const navItems = [
    { id: 'home' as NavView, label: 'Home', icon: Home },
    { id: 'report' as NavView, label: 'Report Issue', icon: Camera },
    { id: 'my-reports' as NavView, label: 'My Reports', icon: FileText },
    { id: 'map' as NavView, label: 'Map', icon: Map },
    { id: 'track' as NavView, label: 'Track Status', icon: Search },
    { id: 'help' as NavView, label: 'Help & Support', icon: HelpCircle },
  ];


  return (
    <aside
      className={`w-56 shrink-0 flex flex-col justify-between py-6 pr-4 pl-3 select-none ${className}`}
    >
      {/* Navigation Items List */}
      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                isActive
                  ? 'bg-[#EEF4FF] text-[#2563EB] font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              {/* Left active vertical accent bar as shown in screenshot */}
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#2563EB] rounded-r-md" />
              )}
              <Icon
                size={17}
                className={isActive ? 'text-[#2563EB]' : 'text-slate-500'}
                strokeWidth={isActive ? 2.3 : 1.9}
              />
              <span className="tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Clean & Green India Card */}
      <div className="pt-6">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs text-center flex flex-col items-center overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 mb-2">
            <MonumentIcon className="w-6 h-6 text-slate-800" />
          </div>
          <div className="text-[11px] font-semibold text-slate-700 leading-snug tracking-tight mb-2.5">
            Together for a<br />
            <span className="text-slate-900 font-bold">Clean & Green India</span>
          </div>
          <IndianFlagRibbon height={14} className="rounded-md" />
        </div>
      </div>
    </aside>
  );
};
