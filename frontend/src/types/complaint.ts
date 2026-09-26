export type ProblemType = 'pothole' | 'garbage' | 'streetlight' | 'drain' | 'other';

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintStatus = 'REPORTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED';

export interface CivicDetectionResult {
  problem_type: ProblemType;
  confidence: number;
  severity: SeverityLevel;
  evidence: string[];
  alternatives: string[];
  needs_retake: boolean;
  suggested_department?: string;
  guidance_message?: string;
  is_fallback?: boolean;
}


export interface ComplaintCreate {
  problem_type: ProblemType;
  confidence: number;
  severity: SeverityLevel;
  evidence: string[];
  latitude: number;
  longitude: number;
  location_name: string;
  department: string;
  description?: string;
  image_url: string;
  duplicate_of?: string | null;
}

export interface Complaint {
  id: string;
  report_id: string;
  problem_type: ProblemType;
  confidence: number;
  severity: SeverityLevel;
  evidence: string[];
  latitude: number;
  longitude: number;
  location_name: string;
  department: string;
  description: string;
  image_url: string;
  status: ComplaintStatus;
  duplicate_of?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
}

export interface HotspotInfo {
  id?: string;
  title: string;
  dominant_issue: string;
  total_reports: number;
  unresolved_count: number;
  high_critical_count: number;
  trend_percentage: number;
  suggested_action: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  repeated_count?: number;
  report_ids?: string[];
}

export interface DailyTrendPoint {
  date: string;
  day_label: string;
  count: number;
}

export interface DashboardStatistics {
  total_reports: number;
  high_critical: number;
  pending: number;
  in_progress: number;
  resolved: number;
  by_category: Record<string, number>;
  by_severity: Record<string, number>;
  by_status: Record<string, number>;
  hotspots: HotspotInfo[];
  daily_trends?: DailyTrendPoint[];
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
  problem_type: string;
  severity: string;
  report_id: string;
}
