import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle2, MapPin, Search } from 'lucide-react';
import type { Complaint } from '../types/complaint';
import { getComplaints } from '../services/api';
import { ProblemIcon, getProblemLabel } from '../components/ProblemIcon';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface MyReportsProps {
  onStartNewReport: () => void;
  selectedComplaintId?: string | null;
}

export const MyReports: React.FC<MyReportsProps> = ({ onStartNewReport, selectedComplaintId }) => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);

  const LIFECYCLE_STEPS = [
    { key: 'REPORTED', label: t('status.reported') },
    { key: 'ASSIGNED', label: t('status.assigned') },
    { key: 'IN_PROGRESS', label: t('status.in_progress') },
    { key: 'RESOLVED', label: t('status.resolved') },
  ];

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{t('myreports.title')}</h1>
          <p className="text-xs text-slate-500">
            {t('myreports.desc')}
          </p>
        </div>
        <button
          onClick={onStartNewReport}
          className="self-start sm:self-auto px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer"
        >
          {t('myreports.new_report')}
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('myreports.search_placeholder')}
          className="w-full pl-9 pr-3.5 py-2 bg-white/80 border border-slate-200/90 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-400"
        />
      </div>

      {loading ? (
        <div className="bg-white/70 backdrop-blur-xs rounded-xl p-8 text-center text-xs text-slate-500 border border-slate-200/80">
          {t('myreports.loading')}
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-xs rounded-xl p-8 text-center text-xs text-slate-500 border border-slate-200/80 space-y-3">
          <p>{t('myreports.empty')}</p>
          <button
            onClick={onStartNewReport}
            className="px-3.5 py-1.5 bg-slate-900 text-white font-medium rounded-lg text-xs cursor-pointer"
          >
            {t('home.cta_button')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* List of Reports */}
          <div className="lg:col-span-6 space-y-2">
            {filteredComplaints.map((c) => {
              const isSelected = activeComplaint?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveComplaint(c)}
                  className={`bg-white/80 backdrop-blur-xs rounded-xl p-3.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-slate-900 ring-1 ring-slate-900/10'
                      : 'border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {c.report_id}
                      </span>
                      <SeverityBadge severity={c.severity} size="sm" />
                    </div>
                    <StatusBadge status={c.status} />
                  </div>

                  <div className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-1">
                    <ProblemIcon type={c.problem_type} size={15} />
                    <span>{getProblemLabel(c.problem_type, t)}</span>
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
            <div className="lg:col-span-6 bg-white/90 backdrop-blur-xs rounded-xl border border-slate-200/80 p-5 space-y-4 shadow-xs sticky top-20">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    {t('myreports.dossier')}
                  </div>
                  <div className="text-sm font-bold font-mono text-slate-900">
                    {activeComplaint.report_id}
                  </div>
                </div>
                <StatusBadge status={activeComplaint.status} />
              </div>

              {/* Status Timeline */}
              <div className="bg-slate-50/70 rounded-lg p-3.5 border border-slate-200/60">
                <div className="text-[11px] font-semibold text-slate-700 mb-3">
                  {t('myreports.timeline')}
                </div>

                <div className="relative flex items-center justify-between">
                  {/* Connecting Line */}
                  <div className="absolute left-2 right-2 top-2.5 h-0.5 bg-slate-200 -z-0" />
                  <div
                    className="absolute left-2 top-2.5 h-0.5 bg-slate-900 -z-0 transition-all duration-300"
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
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-semibold transition-all ${
                            isDone
                              ? 'bg-slate-900 text-white'
                              : 'bg-white border border-slate-300 text-slate-400'
                          } ${isCurrent ? 'ring-2 ring-slate-900/20' : ''}`}
                        >
                          {isDone ? <CheckCircle2 size={11} /> : idx + 1}
                        </div>
                        <span
                          className={`text-[10px] font-medium mt-1 ${
                            isDone ? 'text-slate-900 font-semibold' : 'text-slate-400'
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
              <div className="h-44 w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200/70">
                <img
                  src={
                    activeComplaint.image_url?.startsWith('/api') && token
                      ? `${activeComplaint.image_url}?token=${token}`
                      : activeComplaint.image_url
                  }
                  alt={activeComplaint.problem_type}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Attributes Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('report.detected_problem', 'Problem')}</span>
                  <span className="font-bold text-slate-800">{getProblemLabel(activeComplaint.problem_type, t)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('report.visual_severity', 'Severity')}</span>
                  <SeverityBadge severity={activeComplaint.severity} showSubtitle />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('report.department', 'Department')}</span>
                  <span className="font-semibold text-slate-800">{activeComplaint.department}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">{t('report.location_title', 'Coordinates')}</span>
                  <span className="font-mono text-slate-600 text-[11px]">
                    {activeComplaint.latitude.toFixed(4)}, {activeComplaint.longitude.toFixed(4)}
                  </span>
                </div>
              </div>

              {activeComplaint.description && (
                <div className="text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                    {t('report.evidence', 'Citizen Observation')}
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
