import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { LanguageCode } from '../locales/translations';

export const LanguageSelector: React.FC = () => {
  const { language, setLanguage, currentLanguageInfo, supportedLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200/90 bg-white/80 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
        aria-label="Select language"
        title="Change Language / भाषा बदलें"
      >
        <Globe size={13} className="text-slate-500" />
        <span className="font-semibold text-slate-800">{currentLanguageInfo.nativeName}</span>
        <ChevronDown size={12} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Select Language • भाषा चुनें
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {supportedLanguages.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full text-left px-3 py-1.5 flex items-center justify-between hover:bg-slate-100 transition-colors cursor-pointer ${
                    isSelected ? 'bg-slate-50 text-slate-900 font-semibold' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-900">{lang.nativeName}</span>
                    <span className="text-[11px] text-slate-400 font-normal">({lang.name})</span>
                  </div>
                  {isSelected && <Check size={13} className="text-slate-900 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
