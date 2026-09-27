import React from 'react';
import { Shield, ArrowRight } from 'lucide-react';
import type { DashboardStatistics } from '../types/complaint';

interface AuthorityLandingProps {
  onOpenDashboard: () => void;
  stats?: DashboardStatistics | null;
}

export const AuthorityLanding: React.FC<AuthorityLandingProps> = ({
  onOpenDashboard,
  stats,
}) => {
  return (
    <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 text-center max-w-4xl mx-auto">
      {/* Icon Badge */}
      <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6 shadow-lg shadow-blue-500/10">
        <Shield className="w-8 h-8" />
      </div>

      {/* Main Titles */}
      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight">
        NagarDrishti AI
      </h1>
      <h2 className="text-xl sm:text-2xl font-semibold text-blue-400 mt-1">
        Authority Portal
      </h2>
      <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-widest uppercase mt-2">
        Municipal Civic Intelligence
      </p>

      {/* Mission statement */}
      <div className="max-w-xl text-slate-300 mt-6 space-y-1.5 text-sm sm:text-base leading-relaxed">
        <p>Monitor city problems.</p>
        <p>Understand geographic hotspots.</p>
        <p>Track civic response.</p>
      </div>

      {/* Main CTA */}
      <div className="mt-8">
        <button
          onClick={onOpenDashboard}
          className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <span>Open Command Center</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Live System Metrics Quick Snapshot */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-14 w-full text-left">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Total City Reports</span>
            <p className="text-xl font-bold text-slate-100 mt-1 font-mono">{stats.total_reports}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">High / Critical</span>
            <p className="text-xl font-bold text-rose-400 mt-1 font-mono">{stats.high_critical}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Active In-Progress</span>
            <p className="text-xl font-bold text-amber-400 mt-1 font-mono">{stats.in_progress}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Resolved Issues</span>
            <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">{stats.resolved}</p>
          </div>
        </div>
      )}

      {/* Footer System Architecture Info */}
      <div className="mt-16 pt-8 border-t border-slate-800/80 text-xs text-slate-400 flex flex-wrap justify-center gap-6">
        <span>Shared FastAPI Backend</span>
        <span>•</span>
        <span>Supabase Spatial PostgreSQL</span>
        <span>•</span>
        <span>Multimodal Gemini Vision</span>
      </div>
    </div>
  );
};
