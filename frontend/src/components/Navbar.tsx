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
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { AshokaEmblem, NagarDrishtiLogo } from './CivicEmblems';
import { LanguageSelector } from './LanguageSelector';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { NavView } from './Sidebar';

interface NavbarProps {
  currentView: NavView;
  onNavigate: (view: NavView, authMode?: 'login' | 'signup') => void;
  onSearch?: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate, onSearch }) => {
  const { t } = useLanguage();
  const { citizen, isLoggedIn, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const displayName = citizen?.name || 'Prithviraj';
  const firstName = displayName.split(' ')[0];
  const initials = citizen
    ? citizen.name.slice(0, 2).toUpperCase()
    : 'PR';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSearchFocused(false);
      onNavigate('my-reports');
    }
  };

  const handleQuickTagClick = (tag: string) => {
    setSearchQuery(tag);
    if (onSearch) {
      onSearch(tag);
    }
    setSearchFocused(false);
    onNavigate('my-reports');
  };

  const navLinks = [
    { id: 'home' as NavView, labelKey: 'nav.home', defaultLabel: 'Home' },
    { id: 'report' as NavView, labelKey: 'nav.report_issue', defaultLabel: 'Report Issue' },
    { id: 'my-reports' as NavView, labelKey: 'nav.my_reports', defaultLabel: 'My Reports' },
    { id: 'map' as NavView, labelKey: 'nav.map', defaultLabel: 'Map' },
    { id: 'help' as NavView, labelKey: 'nav.help', defaultLabel: 'Help' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors">
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Left: Emblem of India + NagarDrishti AI Brand */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* National Emblem of India */}
            <div
              className="flex items-center cursor-pointer transition-transform hover:scale-105"
              onClick={() => onNavigate('home')}
              title={t('footer.govt', 'Government of India')}
            >
              <AshokaEmblem />
            </div>

            {/* Vertical Divider */}
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            {/* NagarDrishti AI Logo & Tagline */}
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              onClick={() => onNavigate('home')}
            >
              <NagarDrishtiLogo size={34} />
              <div className="flex flex-col justify-center leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[15px] sm:text-[16px] text-slate-900 dark:text-white tracking-tight font-sans group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    NagarDrishti AI
                  </span>
                </div>
                <span className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400 tracking-tight mt-0.5 font-sans">
                  {t('nav.brand_subtitle', 'Safer • Cleaner • Greener')}
                </span>
              </div>
            </div>
          </div>

          {/* Center-Left: Desktop Quick Navigation Tabs */}
          <nav className="hidden xl:flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 text-xs font-medium">
            {navLinks.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onNavigate(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  currentView === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t(tab.labelKey, tab.defaultLabel)}
              </button>
            ))}
          </nav>

          {/* Center: Interactive Search reports, locations, or keywords... */}
          <div className="flex-1 max-w-md hidden md:block mx-2 relative" ref={searchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none"
              />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('nav.search_placeholder', 'Search reports, locations, or keywords...')}
                className="w-full h-10 pl-10 pr-4 text-xs font-normal text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-[#F1F5F9] dark:bg-slate-800/90 hover:bg-[#EDF2F7] dark:hover:bg-slate-750 focus:bg-white dark:focus:bg-slate-900 rounded-xl border border-transparent focus:border-slate-300 dark:focus:border-slate-700 focus:outline-hidden transition-all shadow-2xs font-sans"
              />
            </form>

            {/* Interactive Search Suggestions Popover */}
            {searchFocused && (
              <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-2.5 text-xs font-sans">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                  <span>Quick Search Tags</span>
                  <span className="text-[9.5px]">Press Enter to search</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Pothole', icon: '🕳️' },
                    { label: 'Garbage', icon: '🗑️' },
                    { label: 'Streetlight', icon: '💡' },
                    { label: 'Blocked Drain', icon: '🌊' },
                    { label: 'MP Nagar', icon: '📍' },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => handleQuickTagClick(chip.label)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 dark:hover:text-blue-400 text-xs transition-colors cursor-pointer"
                    >
                      <span>{chip.icon}</span>
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Looking for a report ID?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchFocused(false);
                      window.location.hash = 'track';
                    }}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Track ID</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right: Theme Toggle + Language Selector + Bell + Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Language Selector placed prominently in Navbar */}
            <div className="hidden sm:inline-flex items-center">
              <LanguageSelector />
            </div>

            {/* Light / Dark Mode Toggle */}
            <ThemeToggle />

            {/* Interactive Notification Bell */}
            <div className="relative inline-block" ref={notifRef}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell size={18} />
                {hasUnreadNotifications && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                )}
              </button>

              {/* Notifications Popover */}
              {notificationsOpen && (
                <div className="absolute right-0 sm:right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs font-sans">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                      <Bell size={14} className="text-amber-500" />
                      <span>{t('nav.notifications', 'Municipal Alerts')}</span>
                    </div>
                    {hasUnreadNotifications && (
                      <button
                        type="button"
                        onClick={() => setHasUnreadNotifications(false)}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {t('nav.mark_all_read', 'Mark all read')}
                      </button>
                    )}
                  </div>
                  <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 text-[11px] flex items-center gap-1">
                          <CheckCircle2 size={12} /> Work Completed
                        </span>
                        <span className="text-[10px] text-slate-400">12m ago</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-xs">Pothole repair at MP Nagar Zone-1 verified by municipal engineer.</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-blue-700 dark:text-blue-400 text-[11px] flex items-center gap-1">
                          <Sparkles size={12} /> AI Civic Grid Active
                        </span>
                        <span className="text-[10px] text-slate-400">1h ago</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-xs">Streetlight outage auto-clustered in Ward 14. Action dispatched.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            {/* User Profile Pill or Sign In */}
            {isLoggedIn ? (
              <div className="relative inline-block" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 py-1 pl-1 pr-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer select-none"
                  aria-expanded={profileOpen}
                >
                  {/* Navy Circle Avatar */}
                  <div className="w-8 h-8 rounded-full bg-[#0B2545] dark:bg-blue-600 text-white text-xs font-bold flex items-center justify-center tracking-tight shadow-xs font-sans">
                    {initials}
                  </div>
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 hidden sm:inline-block max-w-[110px] truncate font-sans">
                    {firstName}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-500 dark:text-slate-400 transition-transform duration-150 ${
                      profileOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Profile Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl p-3 z-50 text-xs space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="w-9 h-9 rounded-full bg-[#0B2545] dark:bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 dark:text-white truncate font-sans">
                          {displayName}
                        </div>
                        <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                          <CheckCircle2 size={11} className="text-emerald-600 dark:text-emerald-400" />
                          <span>{t('auth.verified_citizen', 'Verified Citizen')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="truncate font-sans text-[11px]">
                        <span className="text-slate-400 dark:text-slate-500">Email:</span> {citizen?.email || 'citizen@gov.in'}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1">
                        <Shield size={11} className="text-slate-400 dark:text-slate-500" />
                        <span>Aadhaar/OTP Verified</span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          onNavigate('my-reports');
                        }}
                        className="text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium py-1 px-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        {t('nav.my_reports', 'My Reports')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setProfileOpen(false);
                        }}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 font-medium py-1 px-2.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
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
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {t('auth.login', 'Sign In')}
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('auth', 'signup')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#0B2545] hover:bg-[#07192f] dark:bg-blue-600 dark:hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs"
                >
                  {t('auth.signup', 'Sign Up')}
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 px-2 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in duration-150">
            {/* Mobile Language Selector */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {t('lang.select_language', 'Select Language')}:
              </span>
              <LanguageSelector />
            </div>

            <div className="mb-2">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('nav.search_placeholder', 'Search reports, locations...')}
                  className="w-full h-9 pl-9 pr-3 text-xs bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg"
                />
              </form>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs font-medium">
              <button
                onClick={() => {
                  onNavigate('home');
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl text-left transition-colors ${
                  currentView === 'home'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                {t('nav.home', 'Home')}
              </button>
              <button
                onClick={() => {
                  onNavigate('report');
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl text-left transition-colors ${
                  currentView === 'report'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                {t('nav.report_issue', 'Report Issue')}
              </button>
              <button
                onClick={() => {
                  onNavigate('my-reports');
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl text-left transition-colors ${
                  currentView === 'my-reports'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                {t('nav.my_reports', 'My Reports')}
              </button>
              <button
                onClick={() => {
                  onNavigate('map');
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl text-left transition-colors ${
                  currentView === 'map'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                {t('nav.map', 'Map')}
              </button>
              <button
                onClick={() => {
                  onNavigate('help');
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-xl text-left transition-colors col-span-2 ${
                  currentView === 'help'
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300'
                }`}
              >
                {t('nav.help', 'Help & Support')}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
