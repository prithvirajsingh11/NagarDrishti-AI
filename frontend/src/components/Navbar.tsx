import React from 'react';
import { Camera, FileText, LayoutDashboard } from 'lucide-react';

interface NavbarProps {
  currentView: 'home' | 'report' | 'my-reports' | 'authority';
  onNavigate: (view: 'home' | 'report' | 'my-reports' | 'authority') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onNavigate }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onNavigate('home')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 group-hover:scale-105 transition-transform">
              <Camera size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">
                  NagarDrishti <span className="text-sky-600">AI</span>
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-sky-100 text-sky-800 rounded">
                  नागरिक दृष्टि
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 tracking-tight -mt-0.5">
                AI-Powered Civic Intelligence
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onNavigate('report')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                currentView === 'report'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Camera size={14} />
              <span>Report Issue</span>
            </button>

            <button
              onClick={() => onNavigate('my-reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                currentView === 'my-reports'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <FileText size={14} />
              <span>My Reports</span>
            </button>

            <button
              onClick={() => onNavigate('authority')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                currentView === 'authority'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <LayoutDashboard size={14} />
              <span>Authority Dashboard</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
