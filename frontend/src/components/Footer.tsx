import React from 'react';
import { LanguageSelector } from './LanguageSelector';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200/80 bg-white py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 mt-auto select-none">
      <div className="max-w-[1520px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3 font-sans">
        {/* Left Side: Brand and Ministry Info */}
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-900 text-xs sm:text-sm tracking-tight font-sans">
            NagarDrishti AI
          </span>
          <span className="text-slate-300">|</span>
          <div className="text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center sm:gap-1.5 leading-tight">
            <span>Ministry of Housing and Urban Affairs</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="font-medium text-slate-600">Government of India</span>
          </div>
        </div>

        {/* Right Side: Links & Language Selector */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs">
          <a
            href="#help"
            className="text-slate-500 hover:text-slate-900 transition-colors"
          >
            Help & Guidelines
          </a>
          <span className="text-slate-200">|</span>
          <a
            href="#help"
            className="text-slate-500 hover:text-slate-900 transition-colors"
          >
            Helplines & Contact
          </a>
          <span className="text-slate-200">|</span>
          <div className="inline-flex items-center">
            <LanguageSelector />
          </div>
        </div>
      </div>
    </footer>
  );
};
