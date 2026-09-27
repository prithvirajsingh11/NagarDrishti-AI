import React, { useState } from 'react';
import {
  X,
  MapPin,
  Sparkles,
  AlertTriangle,
  Building2,
  Calendar,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import type { Complaint, ComplaintStatus } from '../types/complaint';
import { ProblemIcon, getProblemLabel } from './ProblemIcon';
import { StatusBadge } from './StatusBadge';
import { SeverityBadge } from './SeverityBadge';

interface ComplaintDrawerProps {
  complaint: Complaint | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: ComplaintStatus) => Promise<void>;
  onSelectDuplicate?: (duplicateReportId: string) => void;
}

export const ComplaintDrawer: React.FC<ComplaintDrawerProps> = ({
  complaint,
  onClose,
  onUpdateStatus,
  onSelectDuplicate,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!complaint) return null;

  const handleStatusChange = async (targetStatus: ComplaintStatus) => {
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      await onUpdateStatus(complaint.id, targetStatus);
    } catch (err: any) {
      setErrorMsg(err.message || 'Status transition failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  const lifecycleSteps: { status: ComplaintStatus; label: string; desc: string }[] = [
    { status: 'REPORTED', label: 'Reported', desc: 'Registered by citizen' },
    { status: 'ASSIGNED', label: 'Assigned', desc: 'Routed to department' },
    { status: 'IN_PROGRESS', label: 'In Progress', desc: 'Crew dispatched on-site' },
    { status: 'RESOLVED', label: 'Resolved', desc: 'Civic defect rectified' },
  ];

  const currentStepIdx = lifecycleSteps.findIndex((s) => s.status === complaint.status);

  // Available valid next actions
  const getNextStatuses = (current: ComplaintStatus): ComplaintStatus[] => {
    switch (current) {
      case 'REPORTED':
        return ['ASSIGNED'];
      case 'ASSIGNED':
        return ['IN_PROGRESS'];
      case 'IN_PROGRESS':
        return ['RESOLVED'];
      case 'RESOLVED':
        return ['IN_PROGRESS']; // allow reopen if needed
      default:
        return [];
    }
  };

  const nextActions = getNextStatuses(complaint.status);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs">
      {/* Backdrop click to close */}
      <div className="flex-1" onClick={onClose} />

      {/* Drawer Container */}
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
              <ProblemIcon type={complaint.problem_type} className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-slate-100">
                  {complaint.report_id}
                </span>
                <StatusBadge status={complaint.status} size="sm" />
                <SeverityBadge severity={complaint.severity} size="sm" />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{getProblemLabel(complaint.problem_type)}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-lg text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Duplicate Warning */}
          {complaint.duplicate_of && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-semibold text-amber-300">Possible Duplicate Detected</h4>
                  <p className="text-[11px] text-amber-200/80 mt-0.5">
                    This complaint is geo-temporally linked to existing report #{complaint.duplicate_of}.
                  </p>
                </div>
              </div>
              {onSelectDuplicate && (
                <button
                  onClick={() => onSelectDuplicate(complaint.duplicate_of!)}
                  className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold rounded-md transition-colors shrink-0 flex items-center gap-1"
                >
                  <span>View Original</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Citizen Photograph Evidence */}
          <div>
            <h4 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider text-[11px]">
              Citizen Photographic Evidence
            </h4>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video relative group">
              <img
                src={complaint.image_url}
                alt={complaint.description || 'Civic defect evidence'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60';
                }}
              />
              <a
                href={complaint.image_url}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-2 right-2 px-2.5 py-1 rounded bg-slate-950/80 hover:bg-slate-900 text-[11px] text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
              >
                <span>Full Image</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {complaint.description && (
              <p className="text-xs text-slate-300 italic mt-2 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                "{complaint.description}"
              </p>
            )}
          </div>

          {/* AI Analysis Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-semibold text-slate-200">
                  Multimodal AI Vision Intelligence
                </h4>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {Math.round(complaint.confidence * 100)}% Confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-medium">Visual Severity</span>
                <div className="mt-1">
                  <SeverityBadge severity={complaint.severity} size="sm" />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-medium">Assigned Category</span>
                <p className="text-slate-200 font-medium capitalize mt-1">
                  {complaint.problem_type}
                </p>
              </div>
            </div>

            {/* Evidence Points */}
            {complaint.evidence && complaint.evidence.length > 0 && (
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-medium">
                  Objective Visual Observations
                </span>
                <ul className="mt-1 space-y-1">
                  {complaint.evidence.map((point, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                      <span className="text-blue-400 mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Location & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>Geographic Location</span>
              </div>
              <p className="text-slate-200 font-medium">{complaint.location_name}</p>
              <p className="text-[11px] font-mono text-slate-400">
                {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}
              </p>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px]">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Suggested Department</span>
              </div>
              <p className="text-slate-200 font-medium">{complaint.department}</p>
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Calendar className="w-3 h-3" />
                <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Lifecycle Timeline */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-200 mb-3 uppercase tracking-wider text-[11px]">
              Civic Resolution Lifecycle
            </h4>
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
              {lifecycleSteps.map((step, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step.status} className="relative">
                    <span
                      className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 ${
                        isCurrent
                          ? 'border-blue-400 bg-blue-500 shadow-sm shadow-blue-500/50'
                          : isPassed
                          ? 'border-emerald-400 bg-emerald-500'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            isCurrent
                              ? 'text-blue-400'
                              : isPassed
                              ? 'text-slate-200'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 text-[10px]">
                            Current Status
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Authority Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-400">
            Current Status: <strong className="text-slate-200">{complaint.status}</strong>
          </span>

          <div className="flex items-center gap-2">
            {nextActions.map((target) => (
              <button
                key={target}
                onClick={() => handleStatusChange(target)}
                disabled={isUpdating}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>Mark as {target.replace('_', ' ')}</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
