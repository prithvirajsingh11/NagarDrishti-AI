import React from 'react';
import { Home, Camera, FileText, Map, User, Search } from 'lucide-react';
import type { NavView } from './Sidebar';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface MobileBottomNavProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  onOpenMenu?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onNavigate,
  onOpenMenu,
}) => {
  const { t } = useLanguage();
  const { isLoggedIn, citizen } = useAuth();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 lg:hidden shadow-[0_-4px_16px_rgba(0,0,0,0.06)] select-none transition-colors"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      aria-label="Mobile Bottom Navigation"
    >
      <div className="grid grid-cols-5 items-center h-14 max-w-md mx-auto px-1">
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
            currentView === 'home'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Home size={19} strokeWidth={currentView === 'home' ? 2.4 : 1.8} />
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
            {t('nav.home', 'Home')}
          </span>
        </button>

        {/* 2. Map */}
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
            currentView === 'map'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Map size={19} strokeWidth={currentView === 'map' ? 2.4 : 1.8} />
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
            {t('nav.map', 'Map')}
          </span>
        </button>

        {/* 3. CENTER PRIMARY: Report Issue (Visually elevated action button) */}
        <div className="flex items-center justify-center relative -top-3">
          <button
            type="button"
            onClick={() => onNavigate('report')}
            className={`w-13 h-13 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all cursor-pointer active:scale-90 ${
              currentView === 'report'
                ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-blue-500/30'
                : 'bg-[#0B2545] hover:bg-[#07192f] dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-slate-900/20'
            }`}
            aria-label="Report Issue"
            title={t('nav.report_issue', 'Report Issue')}
          >
            <Camera size={22} strokeWidth={2.2} />
            <span className="text-[9px] font-bold tracking-tight uppercase leading-none mt-0.5">
              Report
            </span>
          </button>
        </div>

        {/* 4. My Reports */}
        <button
          type="button"
          onClick={() => onNavigate('my-reports')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
            currentView === 'my-reports'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileText size={19} strokeWidth={currentView === 'my-reports' ? 2.4 : 1.8} />
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
            {t('nav.my_reports', 'Reports')}
          </span>
        </button>

        {/* 5. Track Status or Menu / Profile */}
        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => {
              if (onOpenMenu) onOpenMenu();
              else onNavigate('track');
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
              currentView === 'track' || currentView === 'help'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[#0B2545] dark:text-blue-400 flex items-center justify-center text-[10px] font-bold">
              {citizen ? citizen.name.slice(0, 1).toUpperCase() : <User size={12} />}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
              {citizen?.name.split(' ')[0] || 'Profile'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('track')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95 ${
              currentView === 'track'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Search size={19} strokeWidth={currentView === 'track' ? 2.4 : 1.8} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
              Track
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
