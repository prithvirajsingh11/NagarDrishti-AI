import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from app.core.config import settings
from app.services.duplicate_detector import DuplicateDetector, haversine_distance_meters

logger = logging.getLogger(__name__)

# Initial default departments as seeded in 001_initial_schema.sql
DEFAULT_DEPARTMENTS = [
    {"id": "dept-1", "name": "Municipal Roads", "category": "pothole", "is_active": True},
    {"id": "dept-2", "name": "Sanitation", "category": "garbage", "is_active": True},
    {"id": "dept-3", "name": "Electrical / Municipal Lighting", "category": "streetlight", "is_active": True},
    {"id": "dept-4", "name": "Drainage / Sanitation", "category": "drain", "is_active": True},
    {"id": "dept-5", "name": "Manual Review", "category": "other", "is_active": True},
]

now_utc = datetime.now(timezone.utc)

def _dt_offset(days: int, hours: int = 0) -> str:
    """Helper to generate realistic historical timestamps for trend calculations."""
    return (now_utc - timedelta(days=days, hours=hours)).isoformat()

# ==============================================================================
# DETERMINISTIC SEEDED DEMO DATASET (PHASE 3)
# Features 4 distinct geographic clusters, multiple severities, all statuses,
# spread across the last 7 days, with at least one verifiable duplicate.
# ==============================================================================
INITIAL_DEMO_COMPLAINTS = [
    # --- CLUSTER 1: Connaught Place Road Corridor (Potholes Hotspot) ---
    {
        "id": "c001",
        "report_id": "NGD-2026-00101",
        "problem_type": "pothole",
        "confidence": 0.94,
        "severity": "HIGH",
        "evidence": ["Large cavity visible in active road lane", "Cracked asphalt with water pooling"],
        "latitude": 28.6315,
        "longitude": 77.2167,
        "location_name": "Connaught Place Outer Circle near Radial 2",
        "department": "Municipal Roads",
        "description": "Hazardous pothole causing two-wheeler skids near metro gate.",
        "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60",
        "status": "REPORTED",
        "duplicate_of": None,
        "created_at": _dt_offset(3, 4),
        "updated_at": _dt_offset(3, 4)
    },
    {
        "id": "c005",
        "report_id": "NGD-2026-00105",
        "problem_type": "pothole",
        "confidence": 0.82,
        "severity": "MEDIUM",
        "evidence": ["Asphalt wear and shallow road rutting"],
        "latitude": 28.6322,
        "longitude": 77.2175,
        "location_name": "Near Shivaji Stadium Terminal",
        "department": "Municipal Roads",
        "description": "Road surface cracking and minor pothole developing.",
        "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60",
        "status": "RESOLVED",
        "duplicate_of": None,
        "created_at": _dt_offset(5, 6),
        "updated_at": _dt_offset(1, 2)
    },
    {
        "id": "c008",
        "report_id": "NGD-2026-00108",
        "problem_type": "pothole",
        "confidence": 0.91,
        "severity": "CRITICAL",
        "evidence": ["Deep road collapse cave-in exposing base gravel", "Severe vehicular obstruction"],
        "latitude": 28.6310,
        "longitude": 77.2160,
        "location_name": "Radial Road 3, Connaught Place",
        "department": "Municipal Roads",
        "description": "Cave-in on inner lane, traffic backed up.",
        "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60",
        "status": "IN_PROGRESS",
        "duplicate_of": None,
        "created_at": _dt_offset(1, 8),
        "updated_at": _dt_offset(0, 4)
    },
    {
        "id": "c009",
        "report_id": "NGD-2026-00109",
        "problem_type": "pothole",
        "confidence": 0.93,
        "severity": "HIGH",
        "evidence": ["Cavity in road lane matching recent report"],
        "latitude": 28.6316,
        "longitude": 77.2168,
        "location_name": "Connaught Place Outer Circle, Metro Gate 4",
        "department": "Municipal Roads",
        "description": "Duplicate report submitted by nearby pedestrian.",
        "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60",
        "status": "REPORTED",
        "duplicate_of": "NGD-2026-00101",
        "created_at": _dt_offset(0, 3),
        "updated_at": _dt_offset(0, 3)
    },

    # --- CLUSTER 2: Karol Bagh Market Corridor (Waste Accumulation Hotspot) ---
    {
        "id": "c002",
        "report_id": "NGD-2026-00102",
        "problem_type": "garbage",
        "confidence": 0.91,
        "severity": "CRITICAL",
        "evidence": ["Solid waste accumulation blocking entire pedestrian pavement", "Overflowing open municipal bin"],
        "latitude": 28.6520,
        "longitude": 77.1905,
        "location_name": "Ajmal Khan Road Market, Karol Bagh",
        "department": "Sanitation",
        "description": "Severe stench and pedestrian pathway completely obstructed.",
        "image_url": "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=60",
        "status": "ASSIGNED",
        "duplicate_of": None,
        "created_at": _dt_offset(4, 2),
        "updated_at": _dt_offset(2, 1)
    },
    {
        "id": "c010",
        "report_id": "NGD-2026-00110",
        "problem_type": "garbage",
        "confidence": 0.89,
        "severity": "HIGH",
        "evidence": ["Debris pile spilling onto main commercial road", "Scattered organic waste"],
        "latitude": 28.6532,
        "longitude": 77.1912,
        "location_name": "Arya Samaj Road crossing, Karol Bagh",
        "department": "Sanitation",
        "description": "Commercial waste dumped overnight near vegetable market.",
        "image_url": "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=60",
        "status": "REPORTED",
        "duplicate_of": None,
        "created_at": _dt_offset(2, 5),
        "updated_at": _dt_offset(2, 5)
    },
    {
        "id": "c011",
        "report_id": "NGD-2026-00111",
        "problem_type": "garbage",
        "confidence": 0.85,
        "severity": "MEDIUM",
        "evidence": ["Accumulated packaging waste outside electronics shops"],
        "latitude": 28.6515,
        "longitude": 77.1895,
        "location_name": "Gaffar Market Entry Gate, Karol Bagh",
        "department": "Sanitation",
        "description": "Cardboard and plastic bags piling up.",
        "image_url": "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=60",
        "status": "IN_PROGRESS",
        "duplicate_of": None,
        "created_at": _dt_offset(3, 7),
        "updated_at": _dt_offset(0, 5)
    },

    # --- CLUSTER 3: Gole Market / Sector 4 Corridor (Lighting & Electrical Hotspot) ---
    {
        "id": "c003",
        "report_id": "NGD-2026-00103",
        "problem_type": "streetlight",
        "confidence": 0.88,
        "severity": "MEDIUM",
        "evidence": ["Damaged light fixture head hanging unlit", "Pole bent slightly at base"],
        "latitude": 28.6280,
        "longitude": 77.2060,
        "location_name": "Gole Market Road, Sector 4",
        "department": "Electrical / Municipal Lighting",
        "description": "Dark spot on road during night, posing safety hazard for pedestrians.",
        "image_url": "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=60",
        "status": "IN_PROGRESS",
        "duplicate_of": None,
        "created_at": _dt_offset(4, 9),
        "updated_at": _dt_offset(1, 4)
    },
    {
        "id": "c012",
        "report_id": "NGD-2026-00112",
        "problem_type": "streetlight",
        "confidence": 0.92,
        "severity": "HIGH",
        "evidence": ["Streetlight lamp shattered with loose dangling wires"],
        "latitude": 28.6292,
        "longitude": 77.2050,
        "location_name": "Bhai Veer Singh Marg, Gole Market",
        "department": "Electrical / Municipal Lighting",
        "description": "Three consecutive light poles dark at school crossing.",
        "image_url": "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=60",
        "status": "REPORTED",
        "duplicate_of": None,
        "created_at": _dt_offset(1, 3),
        "updated_at": _dt_offset(1, 3)
    },
    {
        "id": "c013",
        "report_id": "NGD-2026-00113",
        "problem_type": "streetlight",
        "confidence": 0.95,
        "severity": "CRITICAL",
        "evidence": ["Pole bent at 45 degree angle across sidewalk", "Live electrical wiring visible"],
        "latitude": 28.6275,
        "longitude": 77.2070,
        "location_name": "Peshwa Road Junction, Gole Market",
        "department": "Electrical / Municipal Lighting",
        "description": "Accident vehicle struck pole, sparks reported during rainfall.",
        "image_url": "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=60",
        "status": "ASSIGNED",
        "duplicate_of": None,
        "created_at": _dt_offset(0, 6),
        "updated_at": _dt_offset(0, 2)
    },

    # --- CLUSTER 4: Janpath Corridor (Drainage & Flood Hazard Hotspot) ---
    {
        "id": "c004",
        "report_id": "NGD-2026-00104",
        "problem_type": "drain",
        "confidence": 0.95,
        "severity": "HIGH",
        "evidence": ["Open stormwater gutter overflowing onto road surface", "Debris clogging inlet grate"],
        "latitude": 28.6185,
        "longitude": 77.2210,
        "location_name": "Janpath Lane near Central Cottage",
        "department": "Drainage / Sanitation",
        "description": "Foul drain water spilling over the asphalt.",
        "image_url": "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=60",
        "status": "REPORTED",
        "duplicate_of": None,
        "created_at": _dt_offset(2, 8),
        "updated_at": _dt_offset(2, 8)
    },
    {
        "id": "c014",
        "report_id": "NGD-2026-00114",
        "problem_type": "drain",
        "confidence": 0.93,
        "severity": "CRITICAL",
        "evidence": ["Complete drain canal overflow flooding bus stop", "Black sewage water backup"],
        "latitude": 28.6195,
        "longitude": 77.2225,
        "location_name": "Tolstoy Marg Bus Shelter, Janpath",
        "department": "Drainage / Sanitation",
        "description": "Pedestrians unable to access bus stop due to sewage flood.",
        "image_url": "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=60",
        "status": "IN_PROGRESS",
        "duplicate_of": None,
        "created_at": _dt_offset(1, 10),
        "updated_at": _dt_offset(0, 6)
    },
    {
        "id": "c015",
        "report_id": "NGD-2026-00115",
        "problem_type": "drain",
        "confidence": 0.81,
        "severity": "LOW",
        "evidence": ["Minor curb runoff pooling near storm grate"],
        "latitude": 28.6178,
        "longitude": 77.2198,
        "location_name": "Windsor Place Roundabout, Janpath",
        "department": "Drainage / Sanitation",
        "description": "Drain grate cleaned and water receding.",
        "image_url": "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=60",
        "status": "RESOLVED",
        "duplicate_of": None,
        "created_at": _dt_offset(6, 4),
        "updated_at": _dt_offset(2, 2)
    },

    # --- CLUSTER 5 / Standalone: Sansad Marg (Other / Unclear) ---
    {
        "id": "c016",
        "report_id": "NGD-2026-00116",
        "problem_type": "other",
        "confidence": 0.76,
        "severity": "LOW",
        "evidence": ["Damaged metal divider barricade on sidewalk boundary"],
        "latitude": 28.6250,
        "longitude": 77.2120,
        "location_name": "Sansad Marg near Patel Chowk",
        "department": "Manual Review",
        "description": "Barricade leaning into footpath.",
        "image_url": "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=60",
        "status": "REPORTED",
        "duplicate_of": None,
        "created_at": _dt_offset(0, 1),
        "updated_at": _dt_offset(0, 1)
    },
    {
        "id": "c017",
        "report_id": "NGD-2026-00117",
        "problem_type": "pothole",
        "confidence": 0.85,
        "severity": "LOW",
        "evidence": ["Minor road surface crack repaved"],
        "latitude": 28.6310,
        "longitude": 77.2162,
        "location_name": "Connaught Place Inner Circle Radial 1",
        "department": "Municipal Roads",
        "description": "Crack in road sealed by maintenance team.",
        "image_url": "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=60",
        "status": "RESOLVED",
        "duplicate_of": None,
        "created_at": _dt_offset(5, 2),
        "updated_at": _dt_offset(1, 1)
    },
    {
        "id": "c018",
        "report_id": "NGD-2026-00118",
        "problem_type": "garbage",
        "confidence": 0.92,
        "severity": "HIGH",
        "evidence": ["Commercial waste pile spilling across alley"],
        "latitude": 28.6472,
        "longitude": 77.1915,
        "location_name": "Ajmal Khan Market Back Alley, Karol Bagh",
        "department": "Sanitation",
        "description": "Urgent clearing needed for morning market access.",
        "image_url": "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800&auto=format&fit=crop&q=60",
        "status": "REPORTED",
        "duplicate_of": None,
        "created_at": _dt_offset(0, 4),
        "updated_at": _dt_offset(0, 4)
    }
]

class Database:
    """
    Supabase PostgreSQL client with resilient local fallback and spatial intelligence.
    Maintains 100% API compatibility whether remote Supabase keys are provided or during local testing.
    """

    def __init__(self):
        self._supabase = None
        self._memory_complaints: List[Dict] = [dict(c) for c in INITIAL_DEMO_COMPLAINTS]
        self._memory_departments: List[Dict] = [dict(d) for d in DEFAULT_DEPARTMENTS]
        self._report_seq = 119

    def reset_demo_data(self) -> Dict:
        """
        Resets seeded demo dataset to pristine initial state while strictly
        preserving any real user-submitted citizen reports.
        """
        demo_ids = {c["id"] for c in INITIAL_DEMO_COMPLAINTS}
        demo_rep_ids = {c["report_id"] for c in INITIAL_DEMO_COMPLAINTS}
        user_complaints = [
            c for c in self._memory_complaints
            if c.get("id") not in demo_ids and c.get("report_id") not in demo_rep_ids
        ]
        fresh_demo = [dict(c) for c in INITIAL_DEMO_COMPLAINTS]
        self._memory_complaints = fresh_demo + user_complaints
        logger.info(f"Reset demo dataset: {len(fresh_demo)} demo records reset, {len(user_complaints)} user reports preserved.")
        return {
            "status": "success",
            "message": "Demo dataset reset to pristine initial state.",
            "demo_count": len(fresh_demo),
            "user_preserved_count": len(user_complaints)
        }

    def _get_client(self):
        if self._supabase is None and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
            try:
                from supabase import create_client
                self._supabase = create_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SERVICE_ROLE_KEY
                )
                logger.info("Connected to remote Supabase PostgreSQL database.")
            except Exception as e:
                logger.warning(f"Could not connect to Supabase: {e}. Using fallback datastore.")
        return self._supabase

    async def get_departments(self) -> List[Dict]:
        client = self._get_client()
        if client:
            try:
                res = client.table("departments").select("*").eq("is_active", True).execute()
                if res.data:
                    return res.data
            except Exception as e:
                logger.warning(f"Failed to query departments from Supabase ({e}). Using local departments.")
        return [d for d in self._memory_departments if d.get("is_active", True)]

    async def create_complaint(self, data: dict) -> dict:
        now = datetime.now(timezone.utc).isoformat()
        report_id = f"NGD-2026-{self._report_seq:05d}"
        self._report_seq += 1

        # Check duplicate
        all_existing = await self.get_complaints()
        duplicate_report_id = DuplicateDetector.check_duplicate(
            new_category=data.get("problem_type"),
            new_lat=data.get("latitude"),
            new_lng=data.get("longitude"),
            existing_reports=all_existing
        )

        complaint_record = {
            "id": str(uuid.uuid4()),
            "report_id": report_id,
            "problem_type": data.get("problem_type"),
            "confidence": float(data.get("confidence", 0.8)),
            "severity": data.get("severity", "LOW"),
            "evidence": data.get("evidence", []),
            "latitude": float(data.get("latitude")),
            "longitude": float(data.get("longitude")),
            "location_name": data.get("location_name", "Reported Location"),
            "department": data.get("department", "Manual Review"),
            "description": data.get("description", ""),
            "image_url": data.get("image_url", ""),
            "status": "REPORTED",
            "duplicate_of": duplicate_report_id or data.get("duplicate_of"),
            "created_at": now,
            "updated_at": now
        }

        # Try Supabase insert
        client = self._get_client()
        if client:
            try:
                res = client.table("complaints").insert(complaint_record).execute()
                if res.data:
                    logger.info(f"Complaint {report_id} persisted to Supabase.")
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Failed to insert into Supabase ({e}). Persisting in local storage.")

        # In-memory persistence
        self._memory_complaints.insert(0, complaint_record)
        return complaint_record

    async def get_complaints(
        self,
        problem_type: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        department: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        client = self._get_client()
        if client:
            try:
                query = client.table("complaints").select("*").order("created_at", desc=True)
                if problem_type:
                    query = query.eq("problem_type", problem_type)
                if severity:
                    query = query.eq("severity", severity)
                if status:
                    query = query.eq("status", status)
                if department:
                    query = query.eq("department", department)
                query = query.limit(limit)
                res = query.execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                logger.warning(f"Supabase complaints fetch error ({e}). Using local store.")

        # Local store filter
        filtered = self._memory_complaints
        if problem_type:
            filtered = [c for c in filtered if c.get("problem_type") == problem_type]
        if severity:
            filtered = [c for c in filtered if c.get("severity") == severity]
        if status:
            filtered = [c for c in filtered if c.get("status") == status]
        if department:
            filtered = [c for c in filtered if c.get("department") == department]

        return filtered[:limit]

    async def get_complaint_by_id(self, id_or_report_id: str) -> Optional[Dict]:
        client = self._get_client()
        if client:
            try:
                res = client.table("complaints").select("*").or_(
                    f"id.eq.{id_or_report_id},report_id.eq.{id_or_report_id}"
                ).execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase fetch by ID error: {e}")

        for c in self._memory_complaints:
            if c.get("id") == id_or_report_id or c.get("report_id") == id_or_report_id:
                return c
        return None

    async def update_complaint_status(self, id_or_report_id: str, new_status: str) -> Optional[Dict]:
        """
        Updates complaint lifecycle status with authority validation.
        Valid statuses: REPORTED, ASSIGNED, IN_PROGRESS, RESOLVED.
        """
        valid_statuses = {"REPORTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"}
        if new_status not in valid_statuses:
            raise ValueError(f"Invalid status '{new_status}'. Allowed: {valid_statuses}")

        now = datetime.now(timezone.utc).isoformat()
        client = self._get_client()
        if client:
            try:
                res = client.table("complaints").update({
                    "status": new_status,
                    "updated_at": now
                }).or_(f"id.eq.{id_or_report_id},report_id.eq.{id_or_report_id}").execute()
                if res.data:
                    return res.data[0]
            except Exception as e:
                logger.warning(f"Supabase update error: {e}")

        for c in self._memory_complaints:
            if c.get("id") == id_or_report_id or c.get("report_id") == id_or_report_id:
                c["status"] = new_status
                c["updated_at"] = now
                return c
        return None

    def calculate_hotspots(self, complaints: List[Dict]) -> List[Dict]:
        """
        Deterministic spatial clustering algorithm for Hotspot Intelligence.
        Groups complaint coordinates into geographic clusters (approx 1.2km radius),
        calculating centroids, unresolved ratios, dominant problem types, and trends.
        """
        if not complaints:
            return []

        clusters: List[Dict] = []
        MAX_CLUSTER_DIST_METERS = 1400.0  # ~1.4 km corridor radius

        for c in complaints:
            lat = c.get("latitude")
            lng = c.get("longitude")
            if lat is None or lng is None:
                continue

            matched_cluster = None
            for cl in clusters:
                dist = haversine_distance_meters(lat, lng, cl["centroid_lat"], cl["centroid_lng"])
                if dist <= MAX_CLUSTER_DIST_METERS:
                    matched_cluster = cl
                    break

            if matched_cluster:
                matched_cluster["reports"].append(c)
                # Recompute centroid
                n = len(matched_cluster["reports"])
                matched_cluster["centroid_lat"] = sum(r["latitude"] for r in matched_cluster["reports"]) / n
                matched_cluster["centroid_lng"] = sum(r["longitude"] for r in matched_cluster["reports"]) / n
                # Track max radius
                d = haversine_distance_meters(lat, lng, matched_cluster["centroid_lat"], matched_cluster["centroid_lng"])
                if d > matched_cluster["max_dist_m"]:
                    matched_cluster["max_dist_m"] = d
            else:
                clusters.append({
                    "centroid_lat": lat,
                    "centroid_lng": lng,
                    "max_dist_m": 400.0,
                    "reports": [c]
                })

        # Process each cluster into HotspotInfo format
        hotspot_list = []
        for idx, cl in enumerate(clusters):
            reps = cl["reports"]
            total_reps = len(reps)

            # Frequency distribution of issues
            cat_counts: Dict[str, int] = {}
            for r in reps:
                cat = r.get("problem_type", "other")
                cat_counts[cat] = cat_counts.get(cat, 0) + 1

            dominant_cat = max(cat_counts, key=cat_counts.get) if cat_counts else "other"
            repeated_count = cat_counts.get(dominant_cat, 0)
            unresolved = sum(1 for r in reps if r.get("status") != "RESOLVED")
            high_critical = sum(1 for r in reps if r.get("severity") in ["HIGH", "CRITICAL"])

            # Category-specific naming and suggested decision-support action
            title_map = {
                "pothole": "ROAD SAFETY HOTSPOT",
                "garbage": "SOLID WASTE ACCUMULATION HOTSPOT",
                "streetlight": "LIGHTING & ELECTRICAL HAZARD HOTSPOT",
                "drain": "DRAINAGE & STORM OVERFLOW HOTSPOT",
                "other": "CIVIC INFRASTRUCTURE HOTSPOT"
            }
            action_map = {
                "pothole": "Inspect affected road corridor & schedule asphalt patching crew",
                "garbage": "Deploy municipal sanitation vehicle & clear pedestrian blockage",
                "streetlight": "Dispatch electrical inspection team & secure overhead wiring",
                "drain": "Clear inlet obstruction & deploy stormwater drainage pumps",
                "other": "Conduct on-site civic inspection with local zonal officer"
            }

            title = title_map.get(dominant_cat, "MUNICIPAL CIVIC HOTSPOT")
            action = action_map.get(dominant_cat, "Inspect affected municipal zone")
            radius_km = round(max(0.4, cl["max_dist_m"] / 1000.0), 1)

            # Trend percentage (deterministic based on recent reports in last 3 days)
            recent_count = sum(1 for r in reps if r.get("created_at") and r["created_at"] >= _dt_offset(3))
            trend_pct = int((recent_count / total_reps) * 45) if total_reps > 0 else 10

            hotspot_list.append({
                "id": f"hs-{idx + 1}",
                "title": title,
                "dominant_issue": f"{dominant_cat.capitalize()} ({repeated_count} reports in corridor)",
                "total_reports": total_reps,
                "unresolved_count": unresolved,
                "high_critical_count": high_critical,
                "trend_percentage": max(12, trend_pct),
                "suggested_action": action,
                "latitude": round(cl["centroid_lat"], 5),
                "longitude": round(cl["centroid_lng"], 5),
                "radius_km": radius_km,
                "repeated_count": repeated_count,
                "report_ids": [r.get("report_id") for r in reps]
            })

        # Sort hotspots by total reports descending
        hotspot_list.sort(key=lambda h: h["total_reports"], reverse=True)
        return hotspot_list

    def calculate_daily_trends(self, complaints: List[Dict]) -> List[Dict]:
        """
        Computes actual 7-day complaint intake volume from database records.
        Returns ordered list of daily trend points (Mon-Sun).
        """
        day_counts: Dict[str, int] = {}
        day_labels: Dict[str, str] = {}

        # Initialize last 7 days
        for i in range(6, -1, -1):
            dt = now_utc - timedelta(days=i)
            key = dt.strftime("%Y-%m-%d")
            day_counts[key] = 0
            day_labels[key] = dt.strftime("%a")  # Mon, Tue, etc.

        for c in complaints:
            ca = c.get("created_at")
            if ca:
                try:
                    dt = datetime.fromisoformat(str(ca).replace("Z", "+00:00"))
                    key = dt.strftime("%Y-%m-%d")
                    if key in day_counts:
                        day_counts[key] += 1
                except Exception:
                    pass

        trends = []
        for key in sorted(day_counts.keys()):
            trends.append({
                "date": key,
                "day_label": day_labels.get(key, key),
                "count": day_counts[key]
            })
        return trends

    def calculate_statistics(self, complaints: List[Dict]) -> Dict:
        """
        Computes dashboard statistics, category distributions,
        7-day trends, and spatial hotspots from given complaints list.
        Handles zero-report empty state gracefully.
        """
        total = len(complaints)
        high_critical = sum(1 for c in complaints if c.get("severity") in ["HIGH", "CRITICAL"])
        pending = sum(1 for c in complaints if c.get("status") == "REPORTED")
        in_progress = sum(1 for c in complaints if c.get("status") in ["ASSIGNED", "IN_PROGRESS"])
        resolved = sum(1 for c in complaints if c.get("status") == "RESOLVED")

        by_category = {"pothole": 0, "garbage": 0, "streetlight": 0, "drain": 0, "other": 0}
        for c in complaints:
            cat = c.get("problem_type", "other")
            by_category[cat] = by_category.get(cat, 0) + 1

        by_severity = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        for c in complaints:
            sev = c.get("severity", "LOW")
            by_severity[sev] = by_severity.get(sev, 0) + 1

        by_status = {"REPORTED": 0, "ASSIGNED": 0, "IN_PROGRESS": 0, "RESOLVED": 0}
        for c in complaints:
            st = c.get("status", "REPORTED")
            by_status[st] = by_status.get(st, 0) + 1

        # Real dynamic hotspot clustering & daily trends
        hotspots = self.calculate_hotspots(complaints)
        daily_trends = self.calculate_daily_trends(complaints)

        return {
            "total_reports": total,
            "high_critical": high_critical,
            "pending": pending,
            "in_progress": in_progress,
            "resolved": resolved,
            "by_category": by_category,
            "by_severity": by_severity,
            "by_status": by_status,
            "hotspots": hotspots,
            "daily_trends": daily_trends
        }

    async def get_dashboard_stats(self) -> Dict:
        """
        Computes live dashboard statistics, category distributions,
        7-day trends, and spatial hotspots based strictly on database records.
        """
        complaints = await self.get_complaints(limit=500)
        return self.calculate_statistics(complaints)

    async def get_heatmap_points(self) -> List[Dict]:
        complaints = await self.get_complaints(limit=500)
        severity_weights = {
            "LOW": 0.35,
            "MEDIUM": 0.60,
            "HIGH": 0.85,
            "CRITICAL": 1.00
        }

        points = []
        for c in complaints:
            if c.get("latitude") and c.get("longitude"):
                points.append({
                    "latitude": c["latitude"],
                    "longitude": c["longitude"],
                    "weight": severity_weights.get(c.get("severity", "LOW"), 0.5),
                    "problem_type": c.get("problem_type", "other"),
                    "severity": c.get("severity", "LOW"),
                    "report_id": c.get("report_id", "")
                })
        return points

db = Database()

def calculate_statistics(complaints: List[Dict]) -> Dict:
    return db.calculate_statistics(complaints)

def calculate_hotspots(complaints: List[Dict]) -> List[Dict]:
    return db.calculate_hotspots(complaints)

def calculate_daily_trends(complaints: List[Dict]) -> List[Dict]:
    return db.calculate_daily_trends(complaints)

