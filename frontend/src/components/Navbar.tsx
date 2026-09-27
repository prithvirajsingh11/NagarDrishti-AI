import React, { useEffect, useRef, useState } from 'react';
import { Camera, FileText, LogOut, ChevronDown, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { LanguageSelector } from './LanguageSelector';

interface NavbarProps {
  currentView: 'home' | 'report' | 'my-reports' | 'auth';
  onNavigate: (view: 'home' | 'report' | 'my-reports' | 'auth', authMode?: 'login' | 'signup') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { t, currentLanguageInfo } = useLanguage();
  const { citizen, isLoggedIn, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileOpen]);

  const firstName = citizen ? citizen.name.split(' ')[0] : '';
  const initials = citizen ? citizen.name.slice(0, 2).toUpperCase() : 'CZ';

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      {/* Subtle minimalist Indian flag accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-[#FF9933] via-slate-200 to-[#138808] opacity-80" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => onNavigate('home')}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0">
              <Camera size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base text-slate-900 tracking-tight">
                  NagarDrishti <span className="font-bold text-slate-900">AI</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded border border-slate-200/60">
                  {currentLanguageInfo.nativeName !== 'English' ? currentLanguageInfo.nativeName : 'नागरिक दृष्टि'}
                </span>
              </div>
              <p className="text-[10px] font-normal text-slate-500 tracking-tight -mt-0.5">
                {t('nav.brand_subtitle', 'AI-Powered Civic Intelligence')}
              </p>
            </div>
          </div>

          {/* Navigation Links, Auth, & Language Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {isLoggedIn ? (
              // LOGGED IN NAVIGATION
              <>
                <nav className="flex items-center gap-1 sm:gap-1.5">
                  <button
                    onClick={() => onNavigate('home')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      currentView === 'home'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span>{t('nav.home', 'Home')}</span>
                  </button>

                  <button
                    onClick={() => onNavigate('report')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                      currentView === 'report'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Camera size={13} />
                    <span>{t('nav.report_issue', 'Report Issue')}</span>
                  </button>

                  <button
                    onClick={() => onNavigate('my-reports')}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                      currentView === 'my-reports'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <FileText size={13} />
                    <span>{t('nav.my_reports', 'My Reports')}</span>
                  </button>
                </nav>

                {/* Profile Dropdown */}
                <div className="relative inline-block ml-1" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white/80 hover:bg-slate-100 text-xs font-medium text-slate-800 transition-colors cursor-pointer"
                    title={citizen?.name}
                  >
                    <div className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                      {initials}
                    </div>
                    <span className="max-w-[70px] sm:max-w-[100px] truncate font-semibold">
                      {firstName}
                    </span>
                    <ChevronDown size={11} className={`text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg p-3 z-50 text-xs space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-slate-900 truncate">{citizen?.name}</div>
                          <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5 mt-0.5">
                            <CheckCircle2 size={10} />
                            <span>{t('auth.verified_citizen', 'Verified Citizen')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="truncate font-mono text-[10px]">
                          <span className="text-slate-400">Email:</span> {citizen?.email}
                        </div>
                      </div>

                      <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileOpen(false);
                            onNavigate('my-reports');
                          }}
                          className="text-xs text-slate-700 hover:text-slate-900 font-medium py-1 px-2 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          {t('nav.my_reports', 'My Reports')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            logout();
                            setProfileOpen(false);
                          }}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 font-medium py-1 px-2 rounded transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <LogOut size={12} />
                          <span>{t('auth.logout', 'Sign Out')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // LOGGED OUT NAVIGATION
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('auth', 'login')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {t('auth.login', 'Sign In')}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('auth', 'signup')}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer shadow-xs"
                >
                  {t('auth.signup', 'Sign Up')}
                </button>
              </div>
            )}

            {/* Language Selector */}
            <div className="pl-1 sm:pl-1.5 border-l border-slate-200/80">
              <LanguageSelector />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
