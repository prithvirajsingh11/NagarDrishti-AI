import type {
  CivicDetectionResult,
  Complaint,
  ComplaintCreate,
  ComplaintStatus,
  DashboardStatistics,
  Department,
  HeatmapPoint
} from '../types/complaint';
import { supabase } from './supabaseClient';

const API_BASE = '/api';

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch (err) {
    console.warn('Could not read auth session token:', err);
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
    let errMsg = 'AI analysis is temporarily unavailable. Please try again.';
    try {
      const err = await res.json();
      if (err.detail) errMsg = err.detail;
    } catch {
      // fallback
    }
    throw new Error(errMsg);
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
    throw new Error('Unable to upload complaint image. Please check your session and try again.');
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
    let errMsg = 'Unable to submit your report. Please try again.';
    try {
      const err = await res.json();
      if (err.detail) errMsg = err.detail;
    } catch {
      // fallback
    }
    throw new Error(errMsg);
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
    throw new Error('Failed to retrieve complaints.');
  }
  return res.json();
}

export async function getComplaintById(id: string): Promise<Complaint> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/complaints/${id}`, { headers });
  if (!res.ok) {
    throw new Error('Complaint not found or access denied.');
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
    throw new Error('Failed to update complaint status.');
  }

  return res.json();
}

export async function getDashboardStatistics(): Promise<DashboardStatistics> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/dashboard/statistics`, { headers });
  if (!res.ok) {
    throw new Error('Failed to load dashboard statistics.');
  }
  return res.json();
}

export async function getDashboardHeatmap(): Promise<HeatmapPoint[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/dashboard/heatmap`, { headers });
  if (!res.ok) {
    throw new Error('Failed to load heatmap data.');
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
