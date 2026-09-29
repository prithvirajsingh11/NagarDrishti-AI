import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle2, ChevronRight, Clock, FileText, MapPin, RotateCcw, Sparkles } from 'lucide-react';
import type { CitizenImpactSummary, Complaint } from '../types/complaint';
import { getCitizenImpact, getComplaints } from '../services/api';
import { getProblemLabel } from '../components/ProblemIcon';
import { StatusBadge } from '../components/StatusBadge';
import { SeverityBadge } from '../components/SeverityBadge';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

interface CitizenHomeProps {
  onStartReport: () => void;
  onSelectComplaint?: (c: Complaint) => void;
}

export const CitizenHome: React.FC<CitizenHomeProps> = ({ onStartReport, onSelectComplaint }) => {
  const { t } = useLanguage();
  const { citizen, isLoggedIn, token } = useAuth();
  const [recentReports, setRecentReports] = useState<Complaint[]>([]);
  const [impact, setImpact] = useState<CitizenImpactSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      setRecentReports([]);
      setImpact(null);
      setLoading(false);
      return;
    }

    Promise.all([
      getComplaints({ limit: 5 }).catch(() => [] as Complaint[]),
      getCitizenImpact().catch(() => null),
    ])
      .then(([reports, impactData]) => {
        setRecentReports(reports);
        setImpact(impactData);
      })
      .finally(() => setLoading(false));
  }, [isLoggedIn]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Minimalist Hero Card */}
      <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-xs relative">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 rounded-full text-xs font-medium text-slate-700 border border-slate-200">
              <Sparkles size={12} className="text-slate-600" />
              <span>{t('home.hero_badge')}</span>
            </div>

            {isLoggedIn && citizen && (
              <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full font-medium">
                {t('auth.verified_citizen', 'Citizen')}: <span className="font-semibold text-slate-800">{citizen.name}</span>
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-tight">
            {t('home.hero_title')} <br />
            <span className="text-slate-500 font-normal">{t('home.hero_subtitle')}</span>
          </h1>

          <p className="text-sm text-slate-600 font-normal leading-relaxed">
            {t('home.hero_desc')}
          </p>

          {/* Primary CTA - Clean Minimalist */}
          <div className="pt-1 flex flex-wrap items-center gap-3">
            <button
              onClick={onStartReport}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl transition-colors inline-flex items-center gap-2.5 cursor-pointer shadow-xs"
            >
              <Camera size={16} />
              <span>{t('home.cta_button')}</span>
              <ChevronRight size={15} className="text-slate-400 ml-1" />
            </button>
            {!isLoggedIn && (
              <span className="text-xs text-slate-500 font-medium">
                • {t('auth.signup', 'Sign up')} required to file
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Your Civic Impact Section (Authenticated Civic Intelligence) */}
      {isLoggedIn && impact && (
        <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3 font-sans">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Your Civic Impact
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              Verified Citizen Profile
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/70">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10.5px] font-medium uppercase tracking-wider">Submitted</span>
                <FileText size={13} className="text-slate-600" />
              </div>
              <div className="text-lg font-bold text-slate-900 font-mono">
                {impact.total_submitted}
              </div>
              <span className="text-[10px] text-slate-500">Reports filed</span>
            </div>

            <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-[10.5px] font-medium uppercase tracking-wider">Resolved</span>
                <CheckCircle2 size={13} className="text-emerald-600" />
              </div>
              <div className="text-lg font-bold text-emerald-900 font-mono">
                {impact.resolved_count}
              </div>
              <span className="text-[10px] text-emerald-700">Fixed issues</span>
            </div>

            <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-[10.5px] font-medium uppercase tracking-wider">In Progress</span>
                <Clock size={13} className="text-blue-600" />
              </div>
              <div className="text-lg font-bold text-blue-900 font-mono">
                {impact.in_progress_count}
              </div>
              <span className="text-[10px] text-blue-700">Active municipal work</span>
            </div>

            <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-[10.5px] font-medium uppercase tracking-wider">Reopened</span>
                <RotateCcw size={13} className="text-amber-600" />
              </div>
              <div className="text-lg font-bold text-amber-900 font-mono">
                {impact.reopened_count}
              </div>
              <span className="text-[10px] text-amber-700">Under review</span>
            </div>
          </div>
        </div>
      )}

      {/* 3 Step Indicator - Minimal */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
        <div className="bg-white/70 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-mono font-semibold text-slate-400 mb-1">01</div>
          <div className="text-xs font-medium text-slate-800">{t('home.step1_title')}</div>
          <div className="text-[11px] text-slate-500">{t('home.step1_desc')}</div>
        </div>
        <div className="bg-white/70 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-mono font-semibold text-slate-400 mb-1">02</div>
          <div className="text-xs font-medium text-slate-800">{t('home.step2_title')}</div>
          <div className="text-[11px] text-slate-500">{t('home.step2_desc')}</div>
        </div>
        <div className="bg-white/70 backdrop-blur-xs p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-xs font-mono font-semibold text-slate-400 mb-1">03</div>
          <div className="text-xs font-medium text-slate-800">{t('home.step3_title')}</div>
          <div className="text-[11px] text-slate-500">{t('home.step3_desc')}</div>
        </div>
      </div>

      {/* Recent Reports Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">{t('home.recent_reports')}</h2>
          <span className="text-xs text-slate-400">{t('home.live_feed')}</span>
        </div>

        {loading ? (
          <div className="bg-white/70 backdrop-blur-xs rounded-xl p-6 text-center text-xs text-slate-500 border border-slate-200/80">
            {t('home.loading')}
          </div>
        ) : recentReports.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-xs rounded-xl p-6 text-center text-xs text-slate-500 border border-slate-200/80">
            {isLoggedIn ? t('home.no_reports', 'No reports filed yet. Start by reporting an issue.') : 'Sign in to see your recently submitted civic reports.'}
          </div>
        ) : (
          <div className="space-y-2">
            {recentReports.map((c) => {
              const displayImage =
                c.image_url?.startsWith('/api') && token
                  ? `${c.image_url}?token=${encodeURIComponent(token)}`
                  : c.image_url;

              return (
                <div
                  key={c.id}
                  onClick={() => onSelectComplaint && onSelectComplaint(c)}
                  className="bg-white/80 backdrop-blur-xs rounded-xl p-3 border border-slate-200/80 hover:border-slate-300 transition-colors shadow-xs flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-200/70">
                    <img
                      src={displayImage}
                      alt={c.problem_type}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-xs text-slate-900 truncate">
                        {getProblemLabel(c.problem_type, t)}
                      </span>
                      <SeverityBadge severity={c.severity} size="sm" />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
                      <MapPin size={10} className="shrink-0 text-slate-400" />
                      <span className="truncate">{c.location_name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {c.report_id}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
