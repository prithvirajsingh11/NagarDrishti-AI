import type {
  Complaint,
  ComplaintStatus,
  DashboardStatistics,
  Department,
  HeatmapPoint,
} from '../types/complaint';

const API_BASE = '/api';

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
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to retrieve complaints.');
  }
  return res.json();
}

export async function getComplaintById(id: string): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}`);
  if (!res.ok) {
    throw new Error('Complaint not found.');
  }
  return res.json();
}

export async function updateComplaintStatus(
  id: string,
  status: ComplaintStatus
): Promise<Complaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    let detail = 'Failed to update complaint status.';
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  return res.json();
}

export async function getDashboardStatistics(): Promise<DashboardStatistics> {
  const res = await fetch(`${API_BASE}/dashboard/statistics`);
  if (!res.ok) {
    throw new Error('Failed to load dashboard statistics.');
  }
  return res.json();
}

export async function getDashboardHeatmap(): Promise<HeatmapPoint[]> {
  const res = await fetch(`${API_BASE}/dashboard/heatmap`);
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

export async function resetDemoDataset(): Promise<{
  status: string;
  message: string;
  demo_count: number;
  user_preserved_count: number;
}> {
  const res = await fetch(`${API_BASE}/dashboard/reset-demo`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Failed to reset demo dataset.');
  }
  return res.json();
}
