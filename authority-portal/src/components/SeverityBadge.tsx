import React from 'react';
import type { SeverityLevel } from '../types/complaint';

interface SeverityBadgeProps {
  severity: SeverityLevel | string;
  size?: 'sm' | 'md';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'md' }) => {
  const norm = (severity || 'LOW').toUpperCase();

  const configs: Record<string, { label: string; bg: string; text: string; border: string }> = {
    LOW: {
      label: 'Low',
      bg: 'bg-slate-700/50',
      text: 'text-slate-300',
      border: 'border-slate-600',
    },
    MEDIUM: {
      label: 'Medium',
      bg: 'bg-amber-500/15',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
    },
    HIGH: {
      label: 'High',
      bg: 'bg-orange-500/15',
      text: 'text-orange-400',
      border: 'border-orange-500/30',
    },
    CRITICAL: {
      label: 'Critical',
      bg: 'bg-red-500/20',
      text: 'text-red-400 font-semibold',
      border: 'border-red-500/40',
    },
  };

  const c = configs[norm] || configs.LOW;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center rounded-md border ${c.bg} ${c.text} ${c.border} ${padding}`}
    >
      {c.label}
    </span>
  );
};
