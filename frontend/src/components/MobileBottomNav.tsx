import React, { useEffect, useState } from 'react';
import { Home, Camera, FileText, Map, User, Search, Shield } from 'lucide-react';
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
  const { isLoggedIn, citizen, activeRole, isAuthority } = useAuth();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Android Virtual Keyboard Detection: hide bottom navigation when keyboard is open
  useEffect(() => {
    const handleViewportResize = () => {
      if (window.visualViewport) {
        // When Android soft keyboard appears, viewport height shrinks significantly
        const isKeyboard = window.visualViewport.height < window.innerHeight * 0.75;
        setKeyboardVisible(isKeyboard);
      }
    };

    window.visualViewport?.addEventListener('resize', handleViewportResize);
    return () => window.visualViewport?.removeEventListener('resize', handleViewportResize);
  }, []);

  if (keyboardVisible) {
    return null;
  }

  // Authority Navigation Mode
  if (activeRole === 'authority' || isAuthority) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 lg:hidden shadow-xs select-none transition-colors"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
        aria-label="Authority Mobile Navigation"
      >
        <div className="grid grid-cols-5 items-center h-14 max-w-md mx-auto px-1">
          {/* 1. Authority Dashboard */}
          <button
            type="button"
            onClick={() => onNavigate('authority')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer active:scale-95 ${
              currentView === 'authority'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Shield size={19} strokeWidth={currentView === 'authority' ? 2.2 : 1.8} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
              Dashboard
            </span>
          </button>

          {/* 2. Complaints Queue */}
          <button
            type="button"
            onClick={() => onNavigate('my-reports')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer active:scale-95 ${
              currentView === 'my-reports'
                ? 'text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText size={19} strokeWidth={currentView === 'my-reports' ? 2.2 : 1.8} />
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
              Queue
            </span>
          </button>

          {/* 3. CENTER PRIMARY: Operational GIS Map */}
          <div className="flex items-center justify-center relative -top-2.5">
            <button
              type="button"
              onClick={() => onNavigate('map')}
              className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-xs ${
                currentView === 'map'
                  ? 'bg-blue-600 text-white'
                  : 'bg-[#0B2545] hover:bg-[#07192f] dark:bg-blue-600 dark:hover:bg-blue-700 text-white'
              }`}
              aria-label="GIS Map"
              title="Operational Map"
            >
              <Map size={20} strokeWidth={2} />
              <span className="text-[9px] font-bold tracking-tight uppercase leading-none mt-0.5">
                GIS
              </span>
            </button>
          </div>

          {/* 4. Track Status / Operations */}
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

          {/* 5. Authority Profile */}
          <button
            type="button"
            onClick={() => {
              if (onOpenMenu) onOpenMenu();
              else onNavigate('help');
            }}
            className="flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer active:scale-95 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-[10px] font-bold">
              {citizen ? citizen.name.slice(0, 1).toUpperCase() : <User size={12} />}
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
              Profile
            </span>
          </button>
        </div>
      </nav>
    );
  }

  // Citizen Navigation Mode
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 lg:hidden shadow-xs select-none transition-colors"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      aria-label="Mobile Bottom Navigation"
    >
      <div className="grid grid-cols-5 items-center h-14 max-w-md mx-auto px-1">
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer active:scale-95 ${
            currentView === 'home'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Home size={19} strokeWidth={currentView === 'home' ? 2.2 : 1.8} />
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
            {t('nav.home', 'Home')}
          </span>
        </button>

        {/* 2. Map */}
        <button
          type="button"
          onClick={() => onNavigate('map')}
          className={`flex flex-col items-center justify-center py-1 rounded-xl transition-colors cursor-pointer active:scale-95 ${
            currentView === 'map'
              ? 'text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Map size={19} strokeWidth={currentView === 'map' ? 2.2 : 1.8} />
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
            {t('nav.map', 'Map')}
          </span>
        </button>

        {/* 3. CENTER PRIMARY: Report Issue */}
        <div className="flex items-center justify-center relative -top-2.5">
          <button
            type="button"
            onClick={() => onNavigate('report')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-colors cursor-pointer active:scale-95 shadow-xs ${
              currentView === 'report'
                ? 'bg-blue-600 text-white'
                : 'bg-[#0B2545] hover:bg-[#07192f] dark:bg-blue-600 dark:hover:bg-blue-700 text-white'
            }`}
            aria-label="Report Issue"
            title={t('nav.report_issue', 'Report Issue')}
          >
            <Camera size={20} strokeWidth={2} />
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
