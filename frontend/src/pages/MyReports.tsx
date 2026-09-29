import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Layers,
  MapPin,
  MessageSquare,
  RotateCcw,
  Search,
  Send,
  Share2
} from 'lucide-react';
import type {
  Complaint,
  ComplaintPublicSummary,
  ComplaintStatus,
  ComplaintStatusHistoryItem,
  StatusRequestResponse
} from '../types/complaint';
import {
  confirmComplaintResolution,
  getComplaintHistory,
  getComplaintStatusRequests,
  getComplaints,
  getControlledImageUrl as resolveControlledImageUrl,
  getPublicComplaintSummary,
  reopenComplaint,
  requestComplaintStatusUpdate
} from '../services/api';
import { ProblemIcon, getProblemLabel } from '../components/ProblemIcon';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface MyReportsProps {
  onStartNewReport: () => void;
  selectedComplaintId?: string | null;
}

type StatusFilterType = 'ALL' | 'REPORTED' | 'IN_PROGRESS' | 'RESOLVED' | 'REOPENED';

export const MyReports: React.FC<MyReportsProps> = ({ onStartNewReport, selectedComplaintId }) => {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL');
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);

  // Phase 6 Authentic Status History
  const [historyItems, setHistoryItems] = useState<ComplaintStatusHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Citizen Verification Action State
  const [confirming, setConfirming] = useState(false);
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Duplicate Safe Summary State
  const [duplicateSummary, setDuplicateSummary] = useState<ComplaintPublicSummary | null>(null);
  const [loadingDuplicateSummary, setLoadingDuplicateSummary] = useState(false);

  // Phase 7 Citizen Follow-Up / Status Update State
  const [statusRequests, setStatusRequests] = useState<StatusRequestResponse[]>([]);
  const [showStatusRequestForm, setShowStatusRequestForm] = useState(false);
  const [statusRequestMessage, setStatusRequestMessage] = useState('');
  const [submittingStatusRequest, setSubmittingStatusRequest] = useState(false);
  const [statusRequestFeedback, setStatusRequestFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    setErrorMessage(null);
    getComplaints()
      .then((data) => {
        setComplaints(data);
        if (selectedComplaintId) {
          const match = data.find((c) => c.id === selectedComplaintId || c.report_id === selectedComplaintId);
          if (match) setActiveComplaint(match);
        } else if (data.length > 0) {
          setActiveComplaint(data[0]);
        } else {
          setActiveComplaint(null);
        }
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Failed to retrieve reports.');
      })
      .finally(() => setLoading(false));
  }, [selectedComplaintId, token]);

  // Load genuine audit trail whenever active complaint changes
  useEffect(() => {
    setShowReopenForm(false);
    setReopenReason('');
    setActionFeedback(null);
    setDuplicateSummary(null);
    setShowStatusRequestForm(false);
    setStatusRequestMessage('');
    setStatusRequestFeedback(null);
    setStatusRequests([]);

    if (!activeComplaint) {
      setHistoryItems([]);
      return;
    }

    const targetId = activeComplaint.id || activeComplaint.report_id;
    getComplaintStatusRequests(targetId)
      .then((reqs) => setStatusRequests(reqs))
      .catch(() => setStatusRequests([]));

    if (activeComplaint.status_history && activeComplaint.status_history.length > 0) {
      setHistoryItems(activeComplaint.status_history);
    } else {
      setLoadingHistory(true);
      const targetId = activeComplaint.id || activeComplaint.report_id;
      getComplaintHistory(targetId)
        .then((items) => setHistoryItems(items))
        .catch(() => setHistoryItems([]))
        .finally(() => setLoadingHistory(false));
    }

    if (activeComplaint?.duplicate_of) {
      setLoadingDuplicateSummary(true);
      getPublicComplaintSummary(activeComplaint.duplicate_of)
        .then((summary) => setDuplicateSummary(summary))
        .catch(() => setDuplicateSummary(null))
        .finally(() => setLoadingDuplicateSummary(false));
    }
  }, [activeComplaint?.id, activeComplaint?.report_id]);

  // Response time calculation based on factual timestamps
  const getFactualResponseTime = (c?: Complaint | null) => {
    if (!c || !c.created_at) return '';
    const now = new Date();
    const created = new Date(c.created_at);
    if (isNaN(created.getTime())) return '';

    const diffMs = now.getTime() - created.getTime();
    const diffHours = Math.max(0, diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (c.status === 'RESOLVED' && c.resolved_at) {
      const resolved = new Date(c.resolved_at);
      if (!isNaN(resolved.getTime())) {
        const resHours = Math.max(1, Math.round((resolved.getTime() - created.getTime()) / (1000 * 60 * 60)));
        if (resHours < 24) {
          return `Resolved in ${resHours}h`;
        }
        const resDays = Math.round(resHours / 24);
        return `Resolved in ${resDays} ${resDays === 1 ? 'day' : 'days'}`;
      }
      return 'Resolved';
    }

    if (c.status === 'REOPENED' || c.citizen_reopened) {
      if (c.citizen_reopened_at) {
        const reo = new Date(c.citizen_reopened_at);
        const reoHours = Math.max(1, Math.round((now.getTime() - reo.getTime()) / (1000 * 60 * 60)));
        if (reoHours < 24) {
          return `Reopened ${reoHours}h ago`;
        }
        const reoDays = Math.round(reoHours / 24);
        return `Reopened ${reoDays}d ago`;
      }
      return 'Reopened for review';
    }

    if (c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED') {
      if (diffHours < 24) {
        return `In progress for ${Math.max(1, Math.round(diffHours))}h`;
      }
      return `In progress for ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
    }

    // Default REPORTED
    if (diffHours < 1) {
      return 'Reported just now';
    }
    if (diffHours < 24) {
      return `Reported ${Math.round(diffHours)}h ago`;
    }
    return `Reported ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  };

  const filterCounts = {
    ALL: complaints.length,
    REPORTED: complaints.filter((c) => c.status === 'REPORTED').length,
    IN_PROGRESS: complaints.filter((c) => c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS').length,
    RESOLVED: complaints.filter((c) => c.status === 'RESOLVED' && !c.citizen_reopened).length,
    REOPENED: complaints.filter((c) => c.status === 'REOPENED' || c.citizen_reopened).length,
  };

  const filteredComplaints = complaints.filter((c) => {
    // 1. Status Filter Tab
    if (statusFilter === 'REPORTED' && c.status !== 'REPORTED') return false;
    if (statusFilter === 'IN_PROGRESS' && !(c.status === 'ASSIGNED' || c.status === 'IN_PROGRESS')) return false;
    if (statusFilter === 'RESOLVED' && (c.status !== 'RESOLVED' || c.citizen_reopened)) return false;
    if (statusFilter === 'REOPENED' && !(c.status === 'REOPENED' || c.citizen_reopened)) return false;

    // 2. Search query filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.report_id.toLowerCase().includes(q) ||
      c.location_name.toLowerCase().includes(q) ||
      c.problem_type.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q)
    );
  });

  const getControlledImageUrl = (url?: string | null) => {
    return resolveControlledImageUrl(url, token);
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleConfirmResolution = async () => {
    if (!activeComplaint) return;
    setConfirming(true);
    setActionFeedback(null);
    try {
      const targetId = activeComplaint.id || activeComplaint.report_id;
      const updated = await confirmComplaintResolution(targetId);
      setActiveComplaint(updated);
      setComplaints((prev) => prev.map((c) => (c.id === updated.id || c.report_id === updated.report_id ? updated : c)));
      getComplaintHistory(targetId).then((items) => setHistoryItems(items)).catch(() => {});
      setActionFeedback({
        message: 'Thank you for confirming. This complaint has been verified as resolved.',
        type: 'success',
      });
    } catch (err: any) {
      setActionFeedback({
        message: err.message || 'Failed to submit confirmation. Please try again.',
        type: 'error',
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleReopenComplaint = async () => {
    if (!activeComplaint) return;
    setReopening(true);
    setActionFeedback(null);
    try {
      const targetId = activeComplaint.id || activeComplaint.report_id;
      const updated = await reopenComplaint(targetId, reopenReason);
      setActiveComplaint(updated);
      setComplaints((prev) => prev.map((c) => (c.id === updated.id || c.report_id === updated.report_id ? updated : c)));
      setShowReopenForm(false);
      getComplaintHistory(targetId).then((items) => setHistoryItems(items)).catch(() => {});
      setActionFeedback({
        message: "The issue is still present. We'll notify the responsible authority.",
        type: 'success',
      });
    } catch (err: any) {
      setActionFeedback({
        message: err.message || 'Failed to submit reopen request. Please try again.',
        type: 'error',
      });
    } finally {
      setReopening(false);
    }
  };

  const handleRequestStatusUpdate = async () => {
    if (!activeComplaint) return;
    setSubmittingStatusRequest(true);
    setStatusRequestFeedback(null);
    try {
      const targetId = activeComplaint.report_id || activeComplaint.id;
      const res = await requestComplaintStatusUpdate(targetId, statusRequestMessage);
      setStatusRequests((prev) => [res, ...prev]);
      setShowStatusRequestForm(false);
      setStatusRequestMessage('');
      setStatusRequestFeedback({
        message: 'Follow-up inquiry submitted. The responsible municipal team has been notified.',
        type: 'success',
      });
    } catch (err: any) {
      setStatusRequestFeedback({
        message: err.message || 'Failed to submit status update request.',
        type: 'error',
      });
    } finally {
      setSubmittingStatusRequest(false);
    }
  };

  const handleShareStatus = async () => {
    if (!activeComplaint) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}#track?id=${encodeURIComponent(activeComplaint.report_id)}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Civic Report ${activeComplaint.report_id}`,
          text: `Track status of civic issue ${activeComplaint.report_id} (${activeComplaint.problem_type}):`,
          url: shareUrl,
        });
        return;
      } catch {
        // fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // fallback
    }
  };

  // Build government-service style lifecycle timeline stages
  const getLifecycleStages = (c: Complaint) => {
    const status = c.status;
    const isReopened = status === 'REOPENED' || c.citizen_reopened;
    const isConfirmed = !!c.citizen_resolution_confirmed;

    const stages: Array<{
      title: string;
      subtitle: string;
      status: 'completed' | 'current' | 'upcoming';
      note?: string;
    }> = [
      {
        title: 'Report Submitted',
        subtitle: formatDateTime(c.created_at),
        status: 'completed',
      },
      {
        title: `Under Review / Assigned to ${c.department}`,
        subtitle:
          status === 'REPORTED'
            ? 'Department routing completed. Awaiting field inspection scheduling.'
            : formatDateTime(c.created_at),
        status: status === 'REPORTED' ? 'current' : 'completed',
      },
      {
        title: 'Work in Progress',
        subtitle:
          status === 'IN_PROGRESS'
            ? 'Municipal field crew actively executing resolution'
            : status === 'RESOLVED' || isReopened
            ? 'Maintenance work performed on site'
            : 'Awaiting field crew dispatch',
        status:
          status === 'IN_PROGRESS'
            ? 'current'
            : status === 'RESOLVED' || isReopened
            ? 'completed'
            : 'upcoming',
      },
    ];

    if (statusRequests.some((r) => r.status === 'PENDING')) {
      stages.push({
        title: 'Status Update Request Pending',
        subtitle: `Citizen submitted follow-up inquiry to ${c.department}.`,
        status: 'current',
      });
    }

    if (status === 'RESOLVED' && !isConfirmed && !isReopened) {
      stages.push({
        title: 'Resolved by Authority',
        subtitle: c.resolved_at
          ? `Work marked complete on ${formatDateTime(c.resolved_at)}. Resolution pending your verification.`
          : 'Work marked complete. Pending your verification.',
        status: 'current',
      });
    } else {
      stages.push({
        title: status === 'RESOLVED' || isReopened ? 'Resolved by Authority' : 'Resolution Pending',
        subtitle:
          c.resolved_at
            ? `Resolved on ${formatDateTime(c.resolved_at)}`
            : status === 'RESOLVED' || isReopened
            ? 'Work marked resolved by authority'
            : 'Awaiting municipal resolution',
        status:
          status === 'RESOLVED' || isReopened
            ? 'completed'
            : 'upcoming',
      });
    }

    if (isReopened) {
      stages.push({
        title: 'Reopened by Citizen',
        subtitle: c.citizen_reopened_at
          ? `Reopened on ${formatDateTime(c.citizen_reopened_at)}`
          : 'Citizen reported issue still exists',
        status: 'current',
        note: c.reopen_reason ? `Citizen note: "${c.reopen_reason}"` : 'Forwarded to department for review.',
      });
    } else if (isConfirmed) {
      stages.push({
        title: 'Citizen Confirmed Resolved',
        subtitle: c.citizen_resolution_confirmed_at
          ? `Verified on ${formatDateTime(c.citizen_resolution_confirmed_at)}`
          : 'Verified resolved by citizen',
        status: 'completed',
      });
    }

    return stages;
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

      {/* Search & Status Filter Section */}
      <div className="space-y-3 font-sans">
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Report ID, Category, Location, or Department..."
            className="w-full pl-9 pr-3.5 py-2 bg-white/80 border border-slate-200/90 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-slate-400 shadow-2xs"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 text-xs">
          {(
            [
              { key: 'ALL', label: 'All' },
              { key: 'REPORTED', label: 'Reported' },
              { key: 'IN_PROGRESS', label: 'In Progress' },
              { key: 'RESOLVED', label: 'Resolved' },
              { key: 'REOPENED', label: 'Reopened' },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.key;
            const count = filterCounts[tab.key];
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                  active
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    active ? 'bg-slate-900 text-white' : 'bg-slate-200/80 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {errorMessage ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-xs text-red-700 space-y-3">
          <p className="font-semibold">{errorMessage}</p>
          {errorMessage.toLowerCase().includes('sign in') && (
            <button
              onClick={() => {
                window.location.hash = 'login';
              }}
              className="px-4 py-1.5 bg-slate-900 text-white rounded-lg font-medium text-xs cursor-pointer shadow-xs"
            >
              {t('auth.login', 'Sign In')}
            </button>
          )}
        </div>
      ) : loading ? (
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
          <div className="lg:col-span-5 space-y-2.5">
            {filteredComplaints.map((c) => {
              const isSelected = activeComplaint?.id === c.id || activeComplaint?.report_id === c.report_id;
              return (
                <div
                  key={c.id || c.report_id}
                  onClick={() => {
                    setActiveComplaint(c);
                    // On mobile, scroll down slightly to view details
                    if (window.innerWidth < 1024) {
                      setTimeout(() => {
                        const el = document.getElementById('report-detail-view');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 50);
                    }
                  }}
                  className={`bg-white rounded-xl p-3.5 border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-sm'
                      : 'border-slate-200/90 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
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

                  <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate mb-2">
                    <MapPin size={11} className="shrink-0 text-slate-400" />
                    <span className="truncate">{c.location_name}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1 font-medium text-[10.5px] text-slate-600 bg-slate-100/90 px-2 py-0.5 rounded border border-slate-200/60 font-mono">
                      <Clock size={11} className="text-slate-400" />
                      {getFactualResponseTime(c)}
                    </span>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-semibold text-slate-800 hover:text-slate-950 text-[11px]"
                    >
                      <span>View Details</span>
                      <ChevronRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Active Report Detail Dossier & Lifecycle Tracker */}
          {activeComplaint && (
            <div
              id="report-detail-view"
              className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 p-5 space-y-5 shadow-xs sticky top-20"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {t('myreports.dossier', 'Citizen Complaint Dossier')}
                  </div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-0.5">
                    {activeComplaint.report_id}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShareStatus}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    title="Share public verification link"
                  >
                    {copiedShare ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-700 font-semibold text-[11px]">Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 size={12} />
                        <span className="text-[11px]">Share Status</span>
                      </>
                    )}
                  </button>
                  <StatusBadge status={activeComplaint.status} />
                </div>
              </div>

              {/* Action feedback alert banner */}
              {actionFeedback && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium border flex items-center justify-between gap-2 ${
                    actionFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border-rose-200'
                  }`}
                >
                  <span>{actionFeedback.message}</span>
                  <button
                    onClick={() => setActionFeedback(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold px-1"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* 1. Data-Driven Lifecycle Timeline */}
              <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3 font-sans">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wider">
                  <span>Complaint Lifecycle Timeline</span>
                  <span className="text-[10px] text-slate-400 font-normal font-mono">
                    {historyItems.length > 0 ? `${historyItems.length} Real Lifecycle Events` : 'Audit Trail'}
                  </span>
                </div>

                <div className="space-y-3.5 pt-1">
                  {loadingHistory ? (
                    <div className="text-center py-4 text-xs text-slate-500">
                      Loading authentic audit trail...
                    </div>
                  ) : historyItems.length > 0 ? (
                    historyItems.map((hist, idx) => {
                      const isLast = idx === historyItems.length - 1;
                      const roleLabel =
                        hist.changed_by_role === 'authority'
                          ? 'Municipal Department'
                          : hist.changed_by_role === 'citizen'
                          ? 'Citizen'
                          : 'System AI';

                      const isResolvedEvent = hist.new_status === 'RESOLVED';
                      const isReopenedEvent = hist.new_status === 'REOPENED';

                      return (
                        <div key={hist.id || idx} className="relative flex items-start gap-3">
                          {!isLast && (
                            <div className="absolute left-2.5 top-6 bottom-0 w-0.5 -ml-[1px] bg-slate-300" />
                          )}

                          {/* Node Icon */}
                          <div className="relative z-10 shrink-0 mt-0.5">
                            {isResolvedEvent ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                <Check size={11} strokeWidth={3} />
                              </div>
                            ) : isReopenedEvent ? (
                              <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                                <RotateCcw size={10} strokeWidth={2.5} />
                              </div>
                            ) : isLast ? (
                              <div className="w-5 h-5 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-slate-900 animate-pulse" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center shadow-xs">
                                <Check size={10} strokeWidth={2.5} />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <StatusBadge status={hist.new_status as ComplaintStatus} />
                                <span className="text-[10px] text-slate-500 font-medium">
                                  by {roleLabel}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                {formatDateTime(hist.created_at)}
                              </span>
                            </div>

                            {hist.note && (
                              <p className="text-[11.5px] mt-1 text-slate-700 leading-snug">
                                {hist.note}
                              </p>
                            )}

                            {isResolvedEvent && activeComplaint.resolution_image_url && (
                              <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                <CheckCircle2 size={11} />
                                <span>Resolution evidence photograph attached</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    getLifecycleStages(activeComplaint).map((stage, idx, arr) => {
                      const isLast = idx === arr.length - 1;
                      return (
                        <div key={idx} className="relative flex items-start gap-3">
                          {!isLast && (
                            <div
                              className={`absolute left-2.5 top-6 bottom-0 w-0.5 -ml-[1px] ${
                                stage.status === 'completed' ? 'bg-slate-700' : 'bg-slate-200'
                              }`}
                            />
                          )}

                          <div className="relative z-10 shrink-0 mt-0.5">
                            {stage.status === 'completed' ? (
                              <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xs">
                                <Check size={11} strokeWidth={3} />
                              </div>
                            ) : stage.status === 'current' ? (
                              <div className="w-5 h-5 rounded-full bg-white border-2 border-slate-900 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-slate-900 animate-pulse" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center">
                                <Circle size={8} className="text-slate-300" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <span
                                className={`text-xs font-semibold ${
                                  stage.status === 'completed'
                                    ? 'text-slate-900'
                                    : stage.status === 'current'
                                    ? 'text-slate-950 font-bold'
                                    : 'text-slate-400'
                                }`}
                              >
                                {stage.title}
                              </span>
                              {stage.status === 'current' && (
                                <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded uppercase">
                                  Current
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-[11px] mt-0.5 leading-snug ${
                                stage.status === 'completed'
                                  ? 'text-slate-600'
                                  : stage.status === 'current'
                                  ? 'text-slate-700'
                                  : 'text-slate-400'
                              }`}
                            >
                              {stage.subtitle}
                            </p>
                            {stage.note && (
                              <p className="text-[11px] mt-1 text-slate-800 bg-white border border-slate-200/90 rounded p-1.5 font-mono">
                                {stage.note}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 2. Status Details Grid */}
              <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-200/70 space-y-3 font-sans">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Status Details
                </div>
                <div className="grid grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Report ID</span>
                    <span className="font-mono font-bold text-slate-900">{activeComplaint.report_id}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Current Status</span>
                    <div className="mt-0.5">
                      <StatusBadge status={activeComplaint.status} />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Problem Type</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 mt-0.5">
                      <ProblemIcon type={activeComplaint.problem_type} size={15} />
                      <span>{getProblemLabel(activeComplaint.problem_type, t)}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Visual Severity</span>
                    <div className="mt-0.5">
                      <SeverityBadge severity={activeComplaint.severity} showSubtitle />
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">Severity is an AI-assisted visual estimate.</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Responsible Department</span>
                    <span className="font-medium text-slate-800 block mt-0.5">{activeComplaint.department}</span>
                    <span className="text-[10px] text-slate-500 block mt-1">Final complaint routing can be reviewed or changed by the citizen.</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Response Time</span>
                    <span className="font-semibold text-slate-800 block mt-0.5 font-mono">
                      {getFactualResponseTime(activeComplaint) || 'Under review'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Submission Date</span>
                    <span className="text-slate-700 block mt-0.5">{formatDateTime(activeComplaint.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Last Updated</span>
                    <span className="text-slate-700 block mt-0.5">
                      {formatDateTime(activeComplaint.updated_at || activeComplaint.created_at)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">Location</span>
                    <span className="text-slate-800 block mt-0.5 font-medium">{activeComplaint.location_name}</span>
                    <span className="font-mono text-slate-500 text-[10px]">
                      GPS: {activeComplaint.latitude.toFixed(4)}, {activeComplaint.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>

                {activeComplaint.description && (
                  <div className="pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-0.5">
                      Citizen Observation
                    </span>
                    <p className="text-slate-700 leading-relaxed">{activeComplaint.description}</p>
                  </div>
                )}
              </div>

              {/* 3. Duplicate / Similar Complaints Notice */}
              {activeComplaint.duplicate_of && (
                <div className="bg-blue-50/80 border border-blue-200/90 rounded-xl p-4 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 text-blue-900 font-bold">
                    <Layers size={16} className="text-blue-700 shrink-0" />
                    <span>Similar issue already reported nearby</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    This issue may already have been reported by another citizen. You can continue viewing your report. Multiple citizen reports help authorities understand the scale of the problem.
                  </p>

                  <div className="bg-white/90 border border-blue-200 rounded-lg p-3 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        Existing Report: {activeComplaint.duplicate_of}
                      </span>
                      {duplicateSummary && (
                        <StatusBadge status={duplicateSummary.status} />
                      )}
                    </div>

                    {loadingDuplicateSummary ? (
                      <div className="text-[10px] text-slate-400">Loading public summary...</div>
                    ) : duplicateSummary ? (
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1.5 border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Category:</span>
                          <span className="capitalize font-medium text-slate-800">{duplicateSummary.problem_type}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Approximate Area:</span>
                          <span className="truncate font-medium text-slate-800 block">{duplicateSummary.location_name}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500">
                        Civic report registered in the proximate corridor.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. Before / After Resolution Evidence */}
              {activeComplaint.resolution_image_url ? (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Resolution Evidence
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Official verification photography provided by municipal team.
                      </p>
                    </div>
                    {activeComplaint.resolved_at && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatDateTime(activeComplaint.resolved_at)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Before Image */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                        <span>Before Resolution</span>
                        <span className="text-[10px] text-slate-400 font-normal">Original Citizen Photo</span>
                      </div>
                      <div className="h-44 w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                        <img
                          src={getControlledImageUrl(activeComplaint.image_url)}
                          alt="Before Resolution"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* After Image */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                        <span>After Resolution</span>
                        <span className="text-[10px] text-emerald-700 font-semibold">Authority Work Photo</span>
                      </div>
                      <div className="h-44 w-full rounded-lg overflow-hidden bg-slate-100 border border-emerald-200">
                        <img
                          src={getControlledImageUrl(activeComplaint.resolution_image_url)}
                          alt="After Resolution"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Single Citizen Photo preview when not yet resolved with evidence */
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">Citizen Evidence Photograph</div>
                  <div className="h-48 w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                    <img
                      src={getControlledImageUrl(activeComplaint.image_url)}
                      alt={activeComplaint.problem_type}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* 5. Citizen Status Follow-Up Request */}
              {activeComplaint.status !== 'RESOLVED' &&
                !activeComplaint.citizen_resolution_confirmed && (
                  <div className="bg-slate-50/80 border border-slate-200/90 rounded-xl p-4 space-y-3 font-sans">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare size={15} className="text-slate-700" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Follow-Up with Authority
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        48h cooldown protection
                      </span>
                    </div>

                    {statusRequestFeedback && (
                      <div
                        className={`p-2.5 rounded-lg text-xs font-medium ${
                          statusRequestFeedback.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {statusRequestFeedback.message}
                      </div>
                    )}

                    {/* Pending Request Banner */}
                    {statusRequests.some((r) => r.status === 'PENDING') ? (
                      <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                          <Clock size={13} className="text-amber-700" />
                          <span>Status Update Request Pending</span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-snug">
                          Your follow-up request has been transmitted to {activeComplaint.department}. The department is reviewing progress.
                        </p>
                      </div>
                    ) : !showStatusRequestForm ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <p className="text-[11px] text-slate-600 leading-snug">
                          Has this issue stalled? You can send an official follow-up note to {activeComplaint.department}.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowStatusRequestForm(true)}
                          className="self-start sm:self-auto shrink-0 px-3.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-medium text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                        >
                          <Send size={12} />
                          <span>Request Update</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5 pt-2 border-t border-slate-200">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Optional note for municipal authorities (max 300 characters):
                          </label>
                          <textarea
                            value={statusRequestMessage}
                            onChange={(e) => setStatusRequestMessage(e.target.value.slice(0, 300))}
                            placeholder="e.g. Danger to morning school buses; please expedite road patch..."
                            rows={2}
                            maxLength={300}
                            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                          />
                          <div className="text-[10px] text-slate-400 text-right">
                            {statusRequestMessage.length}/300
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleRequestStatusUpdate}
                            disabled={submittingStatusRequest}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                          >
                            <Send size={13} />
                            <span>{submittingStatusRequest ? 'Submitting...' : 'Send Follow-Up'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowStatusRequestForm(false)}
                            disabled={submittingStatusRequest}
                            className="px-3 py-2 text-slate-600 hover:text-slate-800 text-xs font-medium cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Past status update requests log */}
                    {statusRequests.length > 0 && (
                      <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Follow-up Inquiries ({statusRequests.length})
                        </span>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {statusRequests.map((req) => (
                            <div
                              key={req.id}
                              className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] flex items-start justify-between gap-2"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                      req.status === 'PENDING'
                                        ? 'bg-amber-100 text-amber-800'
                                        : req.status === 'RESPONDED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {req.status}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    {formatDateTime(req.created_at)}
                                  </span>
                                </div>
                                {req.message && (
                                  <p className="text-slate-700 italic truncate max-w-xs">
                                    "{req.message}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* 6. Citizen Resolution Confirmation / Reopen Flow */}
              {activeComplaint.status === 'RESOLVED' &&
                !activeComplaint.citizen_resolution_confirmed &&
                !activeComplaint.citizen_reopened && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3 font-sans">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-amber-950">
                          Authority marked this issue as resolved. Please verify whether the issue has actually been fixed.
                        </h4>
                        <p className="text-[11px] text-amber-900 leading-snug">
                          Your verification directly impacts civic accountability. Confirm if field repairs are satisfactory or request reopening if the problem persists.
                        </p>
                        <span className="text-[10px] text-amber-800/90 block pt-0.5">
                          Resolution is marked complete after authority action and may be reopened if the issue persists.
                        </span>
                      </div>
                    </div>

                    {!showReopenForm ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleConfirmResolution}
                          disabled={confirming}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          <Check size={14} />
                          {confirming ? 'Confirming...' : 'Confirm Resolution'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowReopenForm(true)}
                          disabled={confirming}
                          className="px-4 py-2 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-medium text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <RotateCcw size={14} />
                          Issue Still Exists
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5 pt-2 border-t border-amber-200/80">
                        <div className="text-[11px] font-semibold text-amber-950">
                          The issue is still present. We will notify the responsible authority.
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Describe what is still wrong (reason for reopening):
                          </label>
                          <textarea
                            value={reopenReason}
                            onChange={(e) => setReopenReason(e.target.value)}
                            placeholder="e.g. Patch is broken, debris remains on roadway, light is still non-functional..."
                            rows={2}
                            className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-slate-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleReopenComplaint}
                            disabled={reopening}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                          >
                            <RotateCcw size={14} />
                            {reopening ? 'Reopening...' : 'Submit Reopen Request'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowReopenForm(false)}
                            disabled={reopening}
                            className="px-3 py-2 text-slate-600 hover:text-slate-800 text-xs font-medium cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Citizen Verified State Notice */}
              {activeComplaint.citizen_resolution_confirmed && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900 font-sans">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-emerald-950">
                      Resolution confirmed
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Citizen confirmation recorded on {formatDateTime(activeComplaint.citizen_resolution_confirmed_at || activeComplaint.updated_at)}. This complaint has reached final verified resolution.
                    </span>
                  </div>
                </div>
              )}

              {/* Reopened State Notice */}
              {(activeComplaint.status === 'REOPENED' || activeComplaint.citizen_reopened) && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-rose-950 font-sans">
                  <RotateCcw size={17} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-bold block text-rose-950">Complaint reopened</span>
                    <p className="text-[11.5px] text-rose-900 leading-snug">
                      Citizen submitted reason: <span className="font-semibold italic">"{activeComplaint.reopen_reason || 'Civic issue still exists at the location.'}"</span>
                    </p>
                    <span className="text-[10px] text-rose-700 block font-mono mt-1">
                      Reopened on {formatDateTime(activeComplaint.citizen_reopened_at || activeComplaint.updated_at)}. Assigned department has been notified to re-inspect.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
