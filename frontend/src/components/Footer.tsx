import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span className="font-bold text-slate-800">NagarDrishti AI</span>
            <span>•</span>
            <span>AI-Powered Civic Intelligence</span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 max-w-xl text-center sm:text-right">
            <ShieldAlert size={14} className="text-amber-500 shrink-0" />
            <span>
              Decision-support system only. AI visual detections require citizen and municipal authority verification.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
