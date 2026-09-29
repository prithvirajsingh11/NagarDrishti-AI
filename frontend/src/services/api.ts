import type {
  CitizenImpactSummary,
  CitizenNotification,
  CivicDetectionResult,
  Complaint,
  ComplaintCreate,
  ComplaintPublicSummary,
  ComplaintStatus,
  ComplaintStatusHistoryItem,
  DashboardStatistics,
  Department,
  HeatmapPoint,
  NearbyCivicIssue,
  SimilarComplaintSummary,
  StatusRequestResponse
} from '../types/complaint';
import { supabase } from './supabaseClient';

const API_BASE = '/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Could not read auth session:', error.message);
    }

    if (session) {
      // If token is about to expire within 60 seconds, attempt proactive refresh
      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at && session.expires_at - now < 60) {
        try {
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (refreshed.session?.access_token) {
            return { Authorization: `Bearer ${refreshed.session.access_token}` };
          }
        } catch {
          // fallback to current session token
        }
      }

      if (session.access_token) {
        return { Authorization: `Bearer ${session.access_token}` };
      }
    }
  } catch (err) {
    console.warn('Could not retrieve Supabase access token:', err);
  }
  return {};
}

async function getJsonAuthHeaders(): Promise<Record<string, string>> {
  const auth = await getAuthHeaders();
  return {
    'Content-Type': 'application/json',
    ...auth,
  };
}

async function parseErrorResponse(res: Response, defaultMsg: string): Promise<Error> {
  if (res.status === 401) {
    return new Error('Your session has expired. Please sign in again.');
  }

  let errMsg = defaultMsg;
  try {
    const data = await res.json();
    if (data && data.detail) {
      if (typeof data.detail === 'string') {
        const lower = data.detail.toLowerCase();
        if (
          lower.includes('expired') ||
          lower.includes('token') ||
          lower.includes('session') ||
          lower.includes('unauthorized') ||
          lower.includes('jwt')
        ) {
          errMsg = 'Your session has expired. Please sign in again.';
        } else {
          errMsg = data.detail;
        }
      }
    }
  } catch {
    // fallback
  }

  return new Error(errMsg);
}

export async function analyzeCivicImage(file: File): Promise<CivicDetectionResult> {
  const formData = new FormData();
  formData.append('file', file);

  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });

  if (!res.ok) {
    throw await parseErrorResponse(res, 'AI analysis is temporarily unavailable. Please try again.');
  }

  return res.json();
}

export async function uploadComplaintImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/upload`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });

  if (!res.ok) {
    throw await parseErrorResponse(
      res,
      'Unable to upload complaint image. Please check your session and try again.'
    );
  }

  const data = await res.json();
  return data.image_url;
}

export async function createComplaint(payload: ComplaintCreate): Promise<Complaint> {
  const headers = await getJsonAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res, 'Unable to submit your report. Please try again.');
  }

  return res.json();
}

export async function getComplaints(filters?: {
  problem_type?: string;
  severity?: string;
  status?: string;
  department?: string;
  limit?: number;
}): Promise<Complaint[]> {
  const params = new URLSearchParams();
  if (filters?.problem_type) params.append('problem_type', filters.problem_type);
  if (filters?.severity) params.append('severity', filters.severity);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.department) params.append('department', filters.department);
  if (filters?.limit) params.append('limit', filters.limit.toString());

  const url = `${API_BASE}/complaints${params.toString() ? '?' + params.toString() : ''}`;
  const headers = await getAuthHeaders();
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to retrieve complaints.');
  }
  return res.json();
}

export async function getComplaintById(id: string): Promise<Complaint> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${id}`, { headers });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'Complaint not found or access denied.');
  }
  return res.json();
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus
): Promise<Complaint> {
  const headers = await getJsonAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to update complaint status.');
  }

  return res.json();
}

export async function confirmComplaintResolution(id: string): Promise<Complaint> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${id}/confirm-resolution`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to confirm complaint resolution.');
  }

  return res.json();
}

export async function reopenComplaint(id: string, reason?: string): Promise<Complaint> {
  const headers = await getJsonAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${id}/reopen`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ reason: reason || '' }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to submit reopen request.');
  }

  return res.json();
}

export async function getPublicComplaintSummary(idOrReportId: string): Promise<ComplaintPublicSummary> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${idOrReportId}/public-summary`, { headers });

  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to retrieve referenced report summary.');
  }

  return res.json();
}

export async function getDashboardStatistics(): Promise<DashboardStatistics> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/dashboard/statistics`, { headers });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to load dashboard statistics.');
  }
  return res.json();
}

export async function getDashboardHeatmap(): Promise<HeatmapPoint[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/dashboard/heatmap`, { headers });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to load heatmap data.');
  }
  return res.json();
}

export async function getDepartments(): Promise<Department[]> {
  const res = await fetch(`${API_BASE}/departments`);
  if (!res.ok) {
    throw new Error('Failed to fetch departments.');
  }
  return res.json();
}

export async function getComplaintHistory(id: string): Promise<ComplaintStatusHistoryItem[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${id}/history`, { headers });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to retrieve complaint history.');
  }
  return res.json();
}

export async function getCitizenImpact(): Promise<CitizenImpactSummary> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/my-impact`, { headers });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to load civic impact summary.');
  }
  return res.json();
}

export async function getNotifications(limit: number = 50): Promise<CitizenNotification[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/notifications?limit=${limit}`, { headers });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to fetch notifications.');
  }
  return res.json();
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: 'PATCH',
    headers,
  });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to update notification.');
  }
}

export async function markAllNotificationsAsRead(): Promise<number> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/notifications/mark-all-read`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to mark all notifications read.');
  }
  const data = await res.json();
  return data.marked_count || 0;
}

export async function getNearbyCivicIssues(filters?: {
  category?: string;
  status?: string;
  radius_km?: number;
  lat?: number;
  lng?: number;
}): Promise<NearbyCivicIssue[]> {
  const params = new URLSearchParams();
  if (filters?.category && filters.category !== 'all') params.append('category', filters.category);
  if (filters?.status && filters.status !== 'ALL') params.append('status', filters.status);
  if (filters?.radius_km) params.append('radius_km', filters.radius_km.toString());
  if (filters?.lat !== undefined) params.append('lat', filters.lat.toString());
  if (filters?.lng !== undefined) params.append('lng', filters.lng.toString());

  const url = `${API_BASE}/nearby/issues${params.toString() ? '?' + params.toString() : ''}`;
  const headers = await getAuthHeaders();
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to fetch nearby civic issues.');
  }
  return res.json();
}

export async function getSimilarComplaints(params: {
  problem_type: string;
  latitude: number;
  longitude: number;
  radius_km?: number;
}): Promise<SimilarComplaintSummary[]> {
  const qp = new URLSearchParams({
    problem_type: params.problem_type,
    latitude: params.latitude.toString(),
    longitude: params.longitude.toString(),
  });
  if (params.radius_km) qp.append('radius_km', params.radius_km.toString());

  const url = `${API_BASE}/complaints/similar?${qp.toString()}`;
  const headers = await getAuthHeaders();
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to check similar reports.');
  }
  return res.json();
}

export async function requestComplaintStatusUpdate(
  idOrReportId: string,
  message?: string
): Promise<StatusRequestResponse> {
  const headers = await getJsonAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${idOrReportId}/status-request`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ message: message || null }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to submit status update request.');
  }
  return res.json();
}

export async function getComplaintStatusRequests(
  idOrReportId: string
): Promise<StatusRequestResponse[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${idOrReportId}/status-requests`, { headers });
  if (!res.ok) {
    throw await parseErrorResponse(res, 'Failed to fetch status update requests.');
  }
  return res.json();
}

