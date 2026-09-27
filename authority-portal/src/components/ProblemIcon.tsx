import React from 'react';
import { AlertCircle, AlertOctagon, Droplets, Lightbulb, Trash2 } from 'lucide-react';
import type { ProblemType } from '../types/complaint';

interface ProblemIconProps {
  type: ProblemType | string;
  className?: string;
}

export const ProblemIcon: React.FC<ProblemIconProps> = ({ type, className = 'w-4 h-4' }) => {
  const norm = (type || 'other').toLowerCase();
  switch (norm) {
    case 'pothole':
      return <AlertOctagon className={`text-amber-400 ${className}`} />;
    case 'garbage':
      return <Trash2 className={`text-rose-400 ${className}`} />;
    case 'streetlight':
      return <Lightbulb className={`text-yellow-300 ${className}`} />;
    case 'drain':
      return <Droplets className={`text-cyan-400 ${className}`} />;
    default:
      return <AlertCircle className={`text-slate-400 ${className}`} />;
  }
};

export function getProblemLabel(type: ProblemType | string): string {
  const norm = (type || 'other').toLowerCase();
  switch (norm) {
    case 'pothole':
      return 'Road Pothole';
    case 'garbage':
      return 'Garbage Dump';
    case 'streetlight':
      return 'Streetlight Defect';
    case 'drain':
      return 'Drainage Issue';
    default:
      return 'General Civic Issue';
  }
}
