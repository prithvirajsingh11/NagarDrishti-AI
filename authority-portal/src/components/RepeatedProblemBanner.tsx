import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import type { HotspotInfo } from '../types/complaint';

interface RepeatedProblemBannerProps {
  hotspots: HotspotInfo[];
  onSelectHotspot: (h: HotspotInfo) => void;
}

export const RepeatedProblemBanner: React.FC<RepeatedProblemBannerProps> = ({
  hotspots,
  onSelectHotspot,
}) => {
  // Find hotspot with the highest repeated report density
  const primaryRepeated = hotspots.find(
    (h) => (h.repeated_count && h.repeated_count > 1) || h.total_reports >= 4
  );

  if (!primaryRepeated) return null;

  const count = primaryRepeated.repeated_count || primaryRepeated.total_reports;

  return (
    <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              REPEATED CIVIC PROBLEM DETECTED
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
              Corridor Hotspot
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-100 mt-0.5">
            {count} {primaryRepeated.dominant_issue} reports clustered within {primaryRepeated.title}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Suggested Operational Action: {primaryRepeated.suggested_action}
          </p>
        </div>
      </div>

      <button
        onClick={() => onSelectHotspot(primaryRepeated)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shrink-0 shadow-sm shadow-amber-500/20"
      >
        <span>Inspect Corridor</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
