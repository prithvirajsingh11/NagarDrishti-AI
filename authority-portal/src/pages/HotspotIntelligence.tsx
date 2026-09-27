import React from 'react';
import {
  Flame,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import type { Complaint, HotspotInfo } from '../types/complaint';
import { ProblemIcon } from '../components/ProblemIcon';

interface HotspotIntelligenceProps {
  hotspots: HotspotInfo[];
  allComplaints: Complaint[];
  onSelectHotspot: (h: HotspotInfo) => void;
  onNavigateToMap: () => void;
  onSelectComplaint: (c: Complaint) => void;
}

export const HotspotIntelligence: React.FC<HotspotIntelligenceProps> = ({
  hotspots,
  allComplaints,
  onSelectHotspot,
  onNavigateToMap,
  onSelectComplaint,
}) => {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-slate-100">
            Hotspot Intelligence & Problem Corridors
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Algorithmic spatial density clustering identifying high-risk recurring civic defects across municipal wards.
        </p>
      </div>

      {/* Hotspots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {hotspots.map((h, idx) => {
          // Related reports for this hotspot based on report_ids or spatial bounds
          const related = allComplaints.filter((c) => {
            if (h.report_ids && h.report_ids.length > 0) {
              return h.report_ids.includes(c.id) || h.report_ids.includes(c.report_id);
            }
            if (c.latitude && c.longitude && h.latitude && h.longitude) {
              const dLat = Math.abs(c.latitude - h.latitude);
              const dLng = Math.abs(c.longitude - h.longitude);
              return dLat < 0.015 && dLng < 0.015;
            }
            return false;
          });

          return (
            <div
              key={idx}
              className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      Corridor #{idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-slate-100 mt-0.5">{h.title}</h3>
                  </div>

                  <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200">
                    <ProblemIcon type={h.dominant_issue} className="w-3.5 h-3.5" />
                    <span className="capitalize">{h.dominant_issue}</span>
                  </div>
                </div>

                {/* Metrics 3-box */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Total Reports</span>
                    <span className="font-mono text-base font-bold text-slate-100">
                      {h.total_reports}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-amber-500/20">
                    <span className="text-[10px] text-amber-300 block">Unresolved</span>
                    <span className="font-mono text-base font-bold text-amber-400">
                      {h.unresolved_count}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950/70 border border-rose-500/20">
                    <span className="text-[10px] text-rose-300 block">High/Critical</span>
                    <span className="font-mono text-base font-bold text-rose-400">
                      {h.high_critical_count}
                    </span>
                  </div>
                </div>

                {/* 7-Day Trend */}
                <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-950/50 rounded-lg border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                    <span>7-Day Density Trend:</span>
                  </div>
                  <span
                    className={`font-semibold font-mono ${
                      h.trend_percentage >= 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {h.trend_percentage > 0 ? `+${h.trend_percentage}%` : `${h.trend_percentage}%`}
                  </span>
                </div>

                {/* Suggested Action */}
                <div className="p-3 bg-blue-950/30 border border-blue-500/30 rounded-lg text-xs space-y-1">
                  <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider block">
                    Recommended Operational Action
                  </span>
                  <p className="text-slate-200 leading-relaxed font-medium">
                    {h.suggested_action}
                  </p>
                </div>

                {/* Related reports preview */}
                {related.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                      Corridor Complaints ({related.length})
                    </span>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {related.slice(0, 3).map((rc) => (
                        <div
                          key={rc.id}
                          onClick={() => onSelectComplaint(rc)}
                          className="flex items-center justify-between p-1.5 rounded bg-slate-950 hover:bg-slate-800 text-[11px] cursor-pointer transition-colors"
                        >
                          <span className="font-mono font-medium text-slate-200">
                            {rc.report_id}
                          </span>
                          <span className="text-slate-400 truncate max-w-[140px]">
                            {rc.location_name}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              rc.severity === 'CRITICAL'
                                ? 'text-rose-400 bg-rose-500/20'
                                : rc.severity === 'HIGH'
                                ? 'text-orange-400 bg-orange-500/20'
                                : 'text-slate-400'
                            }`}
                          >
                            {rc.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Focus on map CTA */}
              <button
                onClick={() => {
                  onSelectHotspot(h);
                  onNavigateToMap();
                }}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                <span>Plot & Inspect on Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
