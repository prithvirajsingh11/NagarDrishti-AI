import React from 'react';
import { AlertCircle, AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { SeverityLevel } from '../types/complaint';

interface SeverityBadgeProps {
  severity: SeverityLevel | string;
  showSubtitle?: boolean;
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  showSubtitle = false,
  size = 'md',
}) => {
  const normalized = (severity || 'LOW').toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'CRITICAL':
        return {
          container: 'bg-rose-50 text-rose-700 border-rose-300 ring-rose-500/20',
          icon: <AlertOctagon size={size === 'sm' ? 10 : 12} className="text-rose-600 shrink-0" />,
          ariaLabel: 'Critical severity level',
        };
      case 'HIGH':
        return {
          container: 'bg-orange-50 text-orange-700 border-orange-300 ring-orange-500/20',
          icon: <AlertTriangle size={size === 'sm' ? 10 : 12} className="text-orange-600 shrink-0" />,
          ariaLabel: 'High severity level',
        };
      case 'MEDIUM':
        return {
          container: 'bg-amber-50 text-amber-700 border-amber-300 ring-amber-500/20',
          icon: <AlertCircle size={size === 'sm' ? 10 : 12} className="text-amber-600 shrink-0" />,
          ariaLabel: 'Medium severity level',
        };
      case 'LOW':
      default:
        return {
          container: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500/20',
          icon: <CheckCircle2 size={size === 'sm' ? 10 : 12} className="text-emerald-600 shrink-0" />,
          ariaLabel: 'Low severity level',
        };
    }
  };

  const { container, icon, ariaLabel } = getStyle();

  return (
    <div className="inline-flex flex-col items-start">
      <span
        aria-label={ariaLabel}
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'
        } ${container}`}
        title="AI-estimated visual severity based on photographic evidence"
      >
        {icon}
        <span>{normalized}</span>
      </span>
      {showSubtitle && (
        <span className="text-[10px] text-slate-500 mt-0.5 tracking-tight">
          AI-estimated visual severity
        </span>
      )}
    </div>
  );
};

