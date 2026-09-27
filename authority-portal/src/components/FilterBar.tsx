import React from 'react';
import { Search, X } from 'lucide-react';
import type { Department } from '../types/complaint';

interface FilterBarProps {
  category: string;
  onCategoryChange: (val: string) => void;
  severity: string;
  onSeverityChange: (val: string) => void;
  status: string;
  onStatusChange: (val: string) => void;
  department: string;
  onDepartmentChange: (val: string) => void;
  dateHorizon: string;
  onDateHorizonChange: (val: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  departments: Department[];
  onResetFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  category,
  onCategoryChange,
  severity,
  onSeverityChange,
  status,
  onStatusChange,
  department,
  onDepartmentChange,
  dateHorizon,
  onDateHorizonChange,
  search,
  onSearchChange,
  departments,
  onResetFilters,
}) => {
  const hasActiveFilters =
    category || severity || status || department || dateHorizon !== 'all' || search;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search report ID, address, keywords..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Category Filter */}
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          aria-label="Filter by problem category"
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Categories</option>
          <option value="pothole">Pothole</option>
          <option value="garbage">Garbage</option>
          <option value="streetlight">Streetlight</option>
          <option value="drain">Drainage</option>
          <option value="other">Other</option>
        </select>

        {/* Severity Filter */}
        <select
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value)}
          aria-label="Filter by severity level"
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter by status"
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="REPORTED">Reported</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        {/* Department Filter */}
        <select
          value={department}
          onChange={(e) => onDepartmentChange(e.target.value)}
          aria-label="Filter by department"
          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 max-w-[180px]"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
        </select>

        {/* Time Horizon Filter */}
        <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 text-xs">
          {[
            { val: 'all', label: 'All Time' },
            { val: 'today', label: 'Today' },
            { val: '7d', label: '7 Days' },
            { val: '30d', label: '30 Days' },
          ].map((item) => (
            <button
              key={item.val}
              onClick={() => onDateHorizonChange(item.val)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                dateHorizon === item.val
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 rounded-lg transition-colors"
            title="Reset all filters"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
};
