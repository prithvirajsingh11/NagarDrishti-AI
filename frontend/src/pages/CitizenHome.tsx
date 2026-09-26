import React, { useEffect, useState } from 'react';
import { Camera, ChevronRight, MapPin, Sparkles } from 'lucide-react';
import type { Complaint } from '../types/complaint';
import { getComplaints } from '../services/api';
import { getProblemLabel } from '../components/ProblemIcon';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';

interface CitizenHomeProps {
  onStartReport: () => void;
  onSelectComplaint?: (c: Complaint) => void;
}

export const CitizenHome: React.FC<CitizenHomeProps> = ({ onStartReport, onSelectComplaint }) => {
  const [recentReports, setRecentReports] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getComplaints({ limit: 5 })
      .then((data) => setRecentReports(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-sky-900/20 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-medium text-sky-100 border border-white/20">
            <Sparkles size={13} className="text-amber-300" />
            <span>AI-Assisted Civic Reporting</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            See a problem in your city? <br />
            Just take a photo.
          </h1>

          <p className="text-sm sm:text-base text-sky-100 font-normal leading-relaxed">
            NagarDrishti AI analyzes road damage, garbage piles, faulty streetlights, and blocked drains automatically with visual severity estimation.
          </p>

          {/* Primary CTA - Dominant */}
          <div className="pt-2">
            <button
              onClick={onStartReport}
              className="w-full sm:w-auto px-6 py-4 bg-white text-slate-900 hover:bg-sky-50 active:scale-[0.98] font-bold text-base rounded-2xl shadow-lg shadow-black/10 flex items-center justify-center gap-3 transition-all duration-150"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center">
                <Camera size={18} />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-slate-900">Report a Civic Issue</div>
                <div className="text-[11px] font-medium text-slate-500">नागरिक समस्या की रिपोर्ट करें</div>
              </div>
              <ChevronRight size={18} className="text-slate-400 ml-auto" />
            </button>
          </div>
        </div>
      </div>

      {/* 3 Step Indicator */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-base font-bold text-sky-600 mb-0.5">1</div>
          <div className="text-xs font-semibold text-slate-800">Snap Photo</div>
          <div className="text-[10px] text-slate-500">Instant AI scan</div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-base font-bold text-sky-600 mb-0.5">2</div>
          <div className="text-xs font-semibold text-slate-800">Verify Triage</div>
          <div className="text-[10px] text-slate-500">Review & confirm</div>
        </div>
        <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-base font-bold text-sky-600 mb-0.5">3</div>
          <div className="text-xs font-semibold text-slate-800">Track Fix</div>
          <div className="text-[10px] text-slate-500">Direct report ID</div>
        </div>
      </div>

      {/* Recent Reports Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Recent Public Reports</h2>
          <span className="text-xs font-medium text-slate-500">Live feed</span>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
            Loading recent reports...
          </div>
        ) : recentReports.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center text-xs text-slate-500 border border-slate-200">
            No complaints reported yet. Be the first to report an issue!
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentReports.map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectComplaint && onSelectComplaint(c)}
                className="bg-white rounded-2xl p-3.5 border border-slate-200 hover:border-sky-300 transition-colors shadow-xs flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  <img
                    src={c.image_url}
                    alt={c.problem_type}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {getProblemLabel(c.problem_type)}
                    </span>
                    <SeverityBadge severity={c.severity} />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                    <MapPin size={11} className="shrink-0 text-slate-400" />
                    <span className="truncate">{c.location_name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {c.report_id}
                  </div>
                </div>

                <div className="shrink-0">
                  <StatusBadge status={c.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
