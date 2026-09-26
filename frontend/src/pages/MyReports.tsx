import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, MapPin, Search } from 'lucide-react';
import type { Complaint } from '../types/complaint';
import { getComplaints } from '../services/api';
import { ProblemIcon, getProblemLabel } from '../components/ProblemIcon';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';

interface MyReportsProps {
  onStartNewReport: () => void;
  selectedComplaintId?: string | null;
}

const LIFECYCLE_STEPS = [
  { key: 'REPORTED', label: 'Reported' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
];

export const MyReports: React.FC<MyReportsProps> = ({ onStartNewReport, selectedComplaintId }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);

  useEffect(() => {
    getComplaints()
      .then((data) => {
        setComplaints(data);
        if (selectedComplaintId) {
          const match = data.find((c) => c.id === selectedComplaintId || c.report_id === selectedComplaintId);
          if (match) setActiveComplaint(match);
        } else if (data.length > 0) {
          setActiveComplaint(data[0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedComplaintId]);

  const filteredComplaints = complaints.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.report_id.toLowerCase().includes(q) ||
      c.location_name.toLowerCase().includes(q) ||
      c.problem_type.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q)
    );
  });

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'REPORTED':
        return 0;
      case 'ASSIGNED':
        return 1;
      case 'IN_PROGRESS':
        return 2;
      case 'RESOLVED':
        return 3;
      default:
        return 0;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-900">My Civic Reports</h1>
          <p className="text-xs text-slate-500">
            Track real-time status and municipal progress of submitted complaints.
          </p>
        </div>
        <button
          onClick={onStartNewReport}
          className="self-start sm:self-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
        >
          + New Report
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Report ID (e.g. NGD-2026-00101) or location..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-xs"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-10 text-center text-xs text-slate-500 border border-slate-200">
          Loading complaints...
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-xs text-slate-500 border border-slate-200 space-y-3">
          <p>No complaints matching your query.</p>
          <button
            onClick={onStartNewReport}
            className="px-4 py-2 bg-sky-600 text-white font-bold rounded-lg text-xs"
          >
            File a Report
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* List of Reports */}
          <div className="lg:col-span-6 space-y-2.5">
            {filteredComplaints.map((c) => {
              const isSelected = activeComplaint?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveComplaint(c)}
                  className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer shadow-xs ${
                    isSelected
                      ? 'border-sky-600 ring-2 ring-sky-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                        {c.report_id}
                      </span>
                      <SeverityBadge severity={c.severity} />
                    </div>
                    <StatusBadge status={c.status} />
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                    <ProblemIcon type={c.problem_type} size={15} />
                    <span>{getProblemLabel(c.problem_type)}</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate mb-1">
                    <MapPin size={11} className="shrink-0 text-slate-400" />
                    <span className="truncate">{c.location_name}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                    <span className="font-medium text-slate-600">{c.department}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Report Detail & Lifecycle Timeline */}
          {activeComplaint && (
            <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 space-y-5 shadow-xs sticky top-20">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Complaint Dossier
                  </div>
                  <div className="text-base font-extrabold font-mono text-slate-900">
                    {activeComplaint.report_id}
                  </div>
                </div>
                <StatusBadge status={activeComplaint.status} />
              </div>

              {/* Status Timeline */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                <div className="text-[11px] font-bold text-slate-700 mb-3">
                  Resolution Progress Timeline
                </div>

                <div className="relative flex items-center justify-between">
                  {/* Connecting Line */}
                  <div className="absolute left-2 right-2 top-3 h-0.5 bg-slate-200 -z-0" />
                  <div
                    className="absolute left-2 top-3 h-0.5 bg-emerald-500 -z-0 transition-all duration-300"
                    style={{
                      width: `${(getStepIndex(activeComplaint.status) / (LIFECYCLE_STEPS.length - 1)) * 96}%`,
                    }}
                  />

                  {LIFECYCLE_STEPS.map((step, idx) => {
                    const currentIdx = getStepIndex(activeComplaint.status);
                    const isDone = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;

                    return (
                      <div key={step.key} className="flex flex-col items-center relative z-10">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border-2 border-slate-300 text-slate-400'
                          } ${isCurrent ? 'ring-4 ring-emerald-500/20' : ''}`}
                        >
                          {isDone ? <CheckCircle2 size={12} /> : idx + 1}
                        </div>
                        <span
                          className={`text-[10px] font-medium mt-1 ${
                            isDone ? 'text-slate-800 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Image Preview */}
              <div className="h-44 w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={activeComplaint.image_url}
                  alt={activeComplaint.problem_type}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Problem</span>
                  <span className="font-bold text-slate-800">{getProblemLabel(activeComplaint.problem_type)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Severity</span>
                  <SeverityBadge severity={activeComplaint.severity} showSubtitle />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Assigned Department</span>
                  <span className="font-semibold text-slate-800">{activeComplaint.department}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Coordinates</span>
                  <span className="font-mono text-slate-600 text-[11px]">
                    {activeComplaint.latitude.toFixed(4)}, {activeComplaint.longitude.toFixed(4)}
                  </span>
                </div>
              </div>

              {activeComplaint.description && (
                <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Citizen Observation
                  </span>
                  <p className="text-slate-700">{activeComplaint.description}</p>
                </div>
              )}

              {activeComplaint.duplicate_of && (
                <div className="text-xs bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-800">
                  <span className="font-bold">Possible duplicate of:</span> {activeComplaint.duplicate_of}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
