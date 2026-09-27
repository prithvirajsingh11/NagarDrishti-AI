from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

class ComplaintStatus(str, Enum):
    REPORTED = "REPORTED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"

class ComplaintCreate(BaseModel):
    problem_type: str = Field(..., description="pothole, garbage, streetlight, drain, other")
    confidence: float = Field(..., ge=0.0, le=1.0)
    severity: str = Field(..., description="LOW, MEDIUM, HIGH, CRITICAL")
    evidence: List[str] = Field(default_factory=list)
    latitude: float = Field(...)
    longitude: float = Field(...)
    location_name: str = Field(..., description="Human-readable address or landmark")
    department: str = Field(..., description="Assigned/suggested department")
    description: Optional[str] = Field("", description="Optional citizen notes")
    image_url: str = Field(..., description="Storage URL of the uploaded image")
    duplicate_of: Optional[str] = Field(None, description="Report ID if this is a known duplicate")

class ComplaintUpdateStatus(BaseModel):
    status: ComplaintStatus

class ComplaintResponse(BaseModel):
    id: str
    report_id: str
    problem_type: str
    confidence: float
    severity: str
    evidence: List[str] = []
    latitude: float
    longitude: float
    location_name: str
    department: str
    description: Optional[str] = ""
    image_url: str
    status: str
    duplicate_of: Optional[str] = None
    citizen_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class HeatmapPoint(BaseModel):
    latitude: float
    longitude: float
    weight: float
    problem_type: str
    severity: str
    report_id: str

class HotspotInfo(BaseModel):
    id: str = "hs-1"
    title: str
    dominant_issue: str
    total_reports: int
    unresolved_count: int
    high_critical_count: int
    trend_percentage: int
    suggested_action: str
    latitude: float
    longitude: float
    radius_km: float
    repeated_count: int = 0
    report_ids: List[str] = []

class DailyTrendPoint(BaseModel):
    date: str
    day_label: str
    count: int

class DashboardStatistics(BaseModel):
    total_reports: int
    high_critical: int
    pending: int
    in_progress: int
    resolved: int
    by_category: Dict[str, int]
    by_severity: Dict[str, int]
    by_status: Dict[str, int]
    hotspots: List[HotspotInfo]
    daily_trends: List[DailyTrendPoint] = []
