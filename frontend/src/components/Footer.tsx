import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/80 backdrop-blur-xs py-5 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span className="font-semibold text-slate-900">NagarDrishti AI</span>
            <span>•</span>
            <span className="text-slate-500 font-normal">AI Civic Intelligence</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 max-w-xl text-center sm:text-right">
            <ShieldAlert size={13} className="text-slate-400 shrink-0" />
            <span>
              {t('footer.disclaimer')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
