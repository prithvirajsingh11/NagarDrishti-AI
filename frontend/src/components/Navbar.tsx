import React from 'react';
import { Camera, FileText, LayoutDashboard } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from './LanguageSelector';

interface NavbarProps {
  currentView: 'home' | 'report' | 'my-reports' | 'authority';
  onNavigate: (view: 'home' | 'report' | 'my-reports' | 'authority') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  const { t, currentLanguageInfo } = useLanguage();

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
                {t('nav.brand_subtitle')}
              </p>
            </div>
          </div>

          {/* Navigation Links & Language Selector */}
          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => onNavigate('report')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentView === 'report'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Camera size={13} />
                <span>{t('nav.report_issue')}</span>
              </button>

              <button
                onClick={() => onNavigate('my-reports')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  currentView === 'my-reports'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText size={13} />
                <span>{t('nav.my_reports')}</span>
              </button>

              <button
                onClick={() => onNavigate('authority')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
                  currentView === 'authority'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                }`}
              >
                <LayoutDashboard size={13} />
                <span className="hidden md:inline">{t('nav.authority')}</span>
                <span className="md:hidden">Portal</span>
              </button>
            </nav>

            {/* Language Selector Dropdown */}
            <div className="ml-1 pl-1 border-l border-slate-200">
              <LanguageSelector />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
