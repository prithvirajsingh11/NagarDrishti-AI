import React, { useEffect } from 'react';
import { Home, Camera, FileText, Map, HelpCircle, Search } from 'lucide-react';
import { MonumentIcon, IndianFlagRibbon } from './CivicEmblems';
import { useLanguage } from '../context/LanguageContext';

export type NavView = 'home' | 'report' | 'my-reports' | 'map' | 'help' | 'auth' | 'track';

interface SidebarProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  className?: string;
}

const SHORTCUT_MAP: Record<string, NavView> = {
  '1': 'home',
  '2': 'report',
  '3': 'my-reports',
  '4': 'map',
  '5': 'help',
  'T': 'track',
};

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, className = '' }) => {
  const { t } = useLanguage();

  const navItems = [
    { id: 'home' as NavView, labelKey: 'nav.home', defaultLabel: 'Home', icon: Home, key: '1' },
    { id: 'report' as NavView, labelKey: 'nav.report_issue', defaultLabel: 'Report Issue', icon: Camera, key: '2' },
    { id: 'my-reports' as NavView, labelKey: 'nav.my_reports', defaultLabel: 'My Reports', icon: FileText, key: '3' },
    { id: 'map' as NavView, labelKey: 'nav.map', defaultLabel: 'Map', icon: Map, key: '4' },
    { id: 'help' as NavView, labelKey: 'nav.help', defaultLabel: 'Help & Support', icon: HelpCircle, key: '5' },
    { id: 'track' as NavView, labelKey: 'home.track_button', defaultLabel: 'Track Status', icon: Search, key: 'T' },
  ];

  // Professional UX: Keyboard shortcut navigation (when not typing in an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const pressed = e.key.toUpperCase();
      const target = SHORTCUT_MAP[pressed];
      if (target) {
        onNavigate(target);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate]);

  return (
    <aside
      className={`w-60 shrink-0 flex flex-col justify-between py-6 pr-4 pl-3 select-none ${className}`}
    >
      {/* Navigation Items List */}
      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          const label = t(item.labelKey, item.defaultLabel);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full relative flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all text-left cursor-pointer group ${
                isActive
                  ? 'bg-blue-50/90 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
              }`}
            >
              {/* Left active vertical accent bar with Indian subtle saffron glow */}
              {isActive && (
                <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#2563EB] dark:bg-blue-400 rounded-r-md" />
              )}
              <div className="flex items-center gap-3.5 min-w-0">
                <Icon
                  size={17}
                  className={isActive ? 'text-[#2563EB] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors'}
                  strokeWidth={isActive ? 2.3 : 1.9}
                />
                <span className="tracking-tight truncate">{label}</span>
              </div>

              {/* Subdued Hotkey Badge for Power Users */}
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-200/50 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 opacity-60 group-hover:opacity-100 transition-opacity">
                {item.key}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Clean & Green India Card */}
      <div className="pt-6">
        <div className="bg-white/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-xs text-center flex flex-col items-center overflow-hidden transition-all hover:shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700/80 border border-slate-100 dark:border-slate-600 flex items-center justify-center text-slate-700 dark:text-slate-200 mb-2">
            <MonumentIcon className="w-6 h-6 text-slate-800 dark:text-slate-200" />
          </div>
          <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-snug tracking-tight mb-2.5">
            {t('sidebar.together_clean_green', 'Together for a Clean & Green India')}
          </div>
          <IndianFlagRibbon height={14} className="rounded-md" />
        </div>
      </div>
    </aside>
  );
};
