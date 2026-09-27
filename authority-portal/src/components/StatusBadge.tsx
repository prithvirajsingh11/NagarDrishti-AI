import React from 'react';
import type { ComplaintStatus } from '../types/complaint';

interface StatusBadgeProps {
  status: ComplaintStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = (status || 'REPORTED').toUpperCase();

  const configs: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    REPORTED: {
      label: 'Reported',
      bg: 'bg-amber-500/15 border-amber-500/30',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
    },
    ASSIGNED: {
      label: 'Assigned',
      bg: 'bg-blue-500/15 border-blue-500/30',
      text: 'text-blue-400',
      dot: 'bg-blue-400',
    },
    IN_PROGRESS: {
      label: 'In Progress',
      bg: 'bg-indigo-500/15 border-indigo-500/30',
      text: 'text-indigo-400',
      dot: 'bg-indigo-400 animate-pulse',
    },
    RESOLVED: {
      label: 'Resolved',
      bg: 'bg-emerald-500/15 border-emerald-500/30',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
    },
  };

  const c = configs[norm] || configs.REPORTED;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${c.bg} ${c.text} ${padding}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};
