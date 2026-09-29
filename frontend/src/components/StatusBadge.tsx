import React from 'react';
import type { ComplaintStatus } from '../types/complaint';

interface StatusBadgeProps {
  status: ComplaintStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyle = () => {
    switch (status?.toUpperCase()) {
      case 'REPORTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ASSIGNED':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'IN_PROGRESS':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'REOPENED':
        return 'bg-rose-50 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getLabel = () => {
    switch (status?.toUpperCase()) {
      case 'REPORTED':
        return 'Reported';
      case 'ASSIGNED':
        return 'Assigned';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'RESOLVED':
        return 'Resolved';
      case 'REOPENED':
        return 'Reopened';
      default:
        return status;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStyle()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {getLabel()}
    </span>
  );
};
