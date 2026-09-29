import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  LogOut,
  Search,
  CheckCircle2,
  Shield,
  Menu,
  X,
} from 'lucide-react';
import { AshokaEmblem, NagarDrishtiLogo } from './CivicEmblems';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { NavView } from './Sidebar';

interface NavbarProps {
  currentView: NavView;
  onNavigate: (view: NavView, authMode?: 'login' | 'signup') => void;
  onSearch?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigate, onSearch }) => {
  const { t } = useLanguage();
  const { citizen, isLoggedIn, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const displayName = citizen?.name || 'Prithviraj';
  const firstName = displayName.split(' ')[0];
  const initials = citizen
    ? citizen.name.slice(0, 2).toUpperCase()
    : 'PR';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
      onNavigate('my-reports');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Emblem of India + NagarDrishti AI Brand */}
          <div className="flex items-center gap-3.5 sm:gap-4 shrink-0">
            {/* National Emblem of India */}
            <div
              className="flex items-center cursor-pointer"
              onClick={() => onNavigate('home')}
              title="Government of India"
            >
              <AshokaEmblem />
            </div>

            {/* Vertical Divider */}
            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

            {/* NagarDrishti AI Logo & Tagline */}
            <div
              className="flex items-center gap-2.5 cursor-pointer"
              onClick={() => onNavigate('home')}
            >
              <NagarDrishtiLogo size={34} />
              <div className="flex flex-col justify-center leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[15px] sm:text-[16px] text-slate-900 tracking-tight font-sans">
                    NagarDrishti AI
                  </span>
                </div>
                <span className="text-[10.5px] font-medium text-slate-500 tracking-tight mt-0.5 font-sans">
                  Safer • Cleaner • Greener
                </span>
              </div>
            </div>
          </div>

          {/* Center: Search reports, locations, or keywords... */}
          <div className="flex-1 max-w-lg hidden md:block mx-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports, locations, or keywords..."
                className="w-full h-10 pl-10 pr-4 text-xs font-normal text-slate-800 placeholder-slate-400 bg-[#F1F5F9] hover:bg-[#EDF2F7] focus:bg-white rounded-xl border border-transparent focus:border-slate-300 focus:outline-hidden transition-all shadow-2xs font-sans"
              />
            </form>
          </div>

          {/* Right: Notification Bell + Divider + User Profile / Sign In */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Notification Bell */}
            <button
              type="button"
              onClick={() => setHasUnreadNotifications(!hasUnreadNotifications)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Notifications"
              aria-label="View notifications"
            >
              <Bell size={18} />
              {hasUnreadNotifications && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-slate-200" />

            {/* User Profile Pill or Sign In */}
            {isLoggedIn ? (
              <div className="relative inline-block" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 py-1 pl-1 pr-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer select-none"
                  aria-expanded={profileOpen}
                >
                  {/* Navy Circle Avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#0B2545] text-white text-xs font-bold flex items-center justify-center tracking-tight shadow-xs font-sans">
                    {initials}
                  </div>
                  <span className="font-semibold text-xs text-slate-800 hidden sm:inline-block max-w-[110px] truncate font-sans">
                    {firstName}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-500 transition-transform duration-150 ${
                      profileOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-3 z-50 text-xs space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                      <div className="w-9 h-9 rounded-full bg-[#0B2545] text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 truncate font-sans">
                          {displayName}
                        </div>
                        <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          <span>Verified Citizen</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="truncate font-sans text-[11px]">
                        <span className="text-slate-400">Email:</span> {citizen?.email || 'citizen@gov.in'}
                      </div>
                      <div className="text-[10.5px] text-slate-500 flex items-center gap-1 mt-1">
                        <Shield size={11} className="text-slate-400" />
                        <span>Aadhaar/OTP Verified</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onNavigate('my-reports');
                        }}
                        className="text-xs text-slate-700 hover:text-slate-900 font-medium py-1 px-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        {t('nav.my_reports', 'My Reports')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setProfileOpen(false);
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-medium py-1 px-2.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <LogOut size={12} />
                        <span>{t('auth.logout', 'Sign Out')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate('auth', 'login')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  {t('auth.login', 'Sign In')}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('auth', 'signup')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#0B2545] hover:bg-[#07192f] text-white transition-colors cursor-pointer shadow-xs"
                >
                  {t('auth.signup', 'Sign Up')}
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 px-2 border-t border-slate-100 space-y-2 animate-in fade-in duration-150">
            <div className="mb-2">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reports, locations..."
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-100 rounded-lg text-slate-800"
                />
              </form>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs font-medium">
              <button
                onClick={() => {
                  onNavigate('home');
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-left"
              >
                Home
              </button>
              <button
                onClick={() => {
                  onNavigate('report');
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg bg-blue-50 text-blue-600 font-semibold text-left"
              >
                Report Issue
              </button>
              <button
                onClick={() => {
                  onNavigate('my-reports');
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-left"
              >
                My Reports
              </button>
              <button
                onClick={() => {
                  onNavigate('map');
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-left"
              >
                Map
              </button>
              <button
                onClick={() => {
                  onNavigate('help');
                  setMobileMenuOpen(false);
                }}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-left"
              >
                Help & Support
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
