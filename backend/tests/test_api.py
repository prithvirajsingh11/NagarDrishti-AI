import io
import asyncio
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.main import app
from app.schemas.ai import CivicDetectionResult, ProblemType, SeverityLevel
from app.services.gemini_provider import GeminiVisionProvider
from app.services.local_provider import LocalVisionProvider
from app.services.severity_engine import SeverityEngine
from app.services.department_resolver import DepartmentResolver
from app.services.duplicate_detector import DuplicateDetector

client = TestClient(app)

# Helper to create valid JPEG in-memory bytes
def create_test_image(color=(128, 128, 128), size=(200, 200), format="JPEG", with_noise=True) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    if with_noise:
        from PIL import ImageDraw
        draw = ImageDraw.Draw(img)
        draw.rectangle([20, 20, 100, 100], fill=(40, 50, 60))
        draw.ellipse([50, 50, 150, 150], fill=(200, 180, 160))
    img.save(buf, format=format)
    return buf.getvalue()



# ============================================================================
# PHASE 1 PRESERVED TESTS (7 Tests)
# ============================================================================

def test_root_endpoint():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["app"] == "NagarDrishti AI"
    assert data["status"] == "online"

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_severity_engine_rules():
    # Critical rule: live wire / sinkhole
    sev = SeverityEngine.evaluate(ProblemType.STREETLIGHT, ["Live wire sparking near pavement"])
    assert sev == SeverityLevel.CRITICAL

    # High rule: active lane / deep
    sev = SeverityEngine.evaluate(ProblemType.POTHOLE, ["Deep crater in active road lane"])
    assert sev == SeverityLevel.HIGH

    # Medium rule: moderate crack
    sev = SeverityEngine.evaluate(ProblemType.POTHOLE, ["Moderate road surface wear"])
    assert sev == SeverityLevel.MEDIUM

def test_department_resolver_rules():
    assert DepartmentResolver.resolve(ProblemType.POTHOLE) == "Municipal Roads"
    assert DepartmentResolver.resolve(ProblemType.GARBAGE) == "Sanitation"
    assert DepartmentResolver.resolve(ProblemType.STREETLIGHT) == "Electrical / Municipal Lighting"
    assert DepartmentResolver.resolve(ProblemType.DRAIN) == "Drainage / Sanitation"
    assert DepartmentResolver.resolve(ProblemType.OTHER) == "Manual Review"

def test_duplicate_detector():
    existing = [
        {
            "report_id": "NGD-2026-00010",
            "problem_type": "pothole",
            "latitude": 28.6139,
            "longitude": 77.2090,
            "status": "REPORTED",
            "created_at": "2026-09-26T12:00:00Z"
        }
    ]

    # Duplicate: same category + very close (within 20m)
    dup = DuplicateDetector.check_duplicate("pothole", 28.61395, 77.20905, existing)
    assert dup == "NGD-2026-00010"

    # Not duplicate: different category
    no_dup_cat = DuplicateDetector.check_duplicate("garbage", 28.61395, 77.20905, existing)
    assert no_dup_cat is None

    # Not duplicate: far away (e.g. 5km away)
    no_dup_dist = DuplicateDetector.check_duplicate("pothole", 28.6500, 77.2500, existing)
    assert no_dup_dist is None

def test_complaints_flow():
    payload = {
        "problem_type": "pothole",
        "confidence": 0.92,
        "severity": "HIGH",
        "evidence": ["Road depression"],
        "latitude": 28.6120,
        "longitude": 77.2080,
        "location_name": "Test Pothole Site",
        "department": "Municipal Roads",
        "description": "Urgent repair needed",
        "image_url": "https://example.com/test.jpg"
    }
    create_res = client.post("/api/complaints", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["report_id"].startswith("NGD-2026-")
    assert created_data["status"] == "REPORTED"
    rep_id = created_data["report_id"]

    get_res = client.get(f"/api/complaints/{rep_id}")
    assert get_res.status_code == 200
    assert get_res.json()["report_id"] == rep_id

    patch_res = client.patch(f"/api/complaints/{rep_id}/status", json={"status": "IN_PROGRESS"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "IN_PROGRESS"

def test_dashboard_endpoints():
    stats_res = client.get("/api/dashboard/statistics")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_reports" in stats
    assert "high_critical" in stats
    assert len(stats["hotspots"]) > 0

    heatmap_res = client.get("/api/dashboard/heatmap")
    assert heatmap_res.status_code == 200
    points = heatmap_res.json()
    assert isinstance(points, list)
    assert len(points) > 0


# ============================================================================
# PHASE 2 TESTS: AI VISION, QUALITY CHECKS, STORAGE & CITIZEN OVERRIDE
# ============================================================================

@pytest.mark.anyio
async def test_gemini_valid_response():
    """Verify Gemini provider processes structured JSON response correctly."""
    mock_resp = MagicMock()
    mock_resp.text = '{"problem_type": "garbage", "confidence": 0.94, "severity": "HIGH", "evidence": ["Overflowing commercial waste bin"], "alternatives": [], "needs_retake": false}'

    provider = GeminiVisionProvider(api_key="test-key")
    with patch.object(provider, "_get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_resp
        mock_get_client.return_value = mock_client

        # Create image with sufficient contrast
        img_bytes = create_test_image(color=(100, 150, 120))
        result = await provider.analyze(img_bytes, mime_type="image/jpeg")

        assert result.problem_type == ProblemType.GARBAGE
        assert result.confidence == 0.94
        assert result.severity in [SeverityLevel.HIGH, SeverityLevel.CRITICAL]
        assert result.suggested_department == "Sanitation"
        assert result.needs_retake is False
        assert result.is_fallback is False

@pytest.mark.anyio
async def test_gemini_malformed_response():
    """Verify Gemini provider handles malformed JSON without crashing."""
    mock_resp = MagicMock()
    mock_resp.text = 'I see a pothole in the road, looks bad!'

    provider = GeminiVisionProvider(api_key="test-key")
    with patch.object(provider, "_get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_resp
        mock_get_client.return_value = mock_client

        img_bytes = create_test_image(color=(120, 120, 120))
        # Should gracefully fall back or return other without crashing
        result = await provider.analyze(img_bytes, mime_type="image/jpeg")
        assert result.needs_retake is True

@pytest.mark.anyio
async def test_low_confidence_safeguard():
    """Verify confidence below 0.75 triggers 'other' and needs_retake=True."""
    mock_resp = MagicMock()
    mock_resp.text = '{"problem_type": "pothole", "confidence": 0.62, "severity": "LOW", "evidence": ["Blurry gray patch"], "alternatives": ["drain"], "needs_retake": false}'

    provider = GeminiVisionProvider(api_key="test-key")
    with patch.object(provider, "_get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.models.generate_content.return_value = mock_resp
        mock_get_client.return_value = mock_client

        img_bytes = create_test_image(color=(100, 120, 140))
        result = await provider.analyze(img_bytes, mime_type="image/jpeg")

        assert result.problem_type == ProblemType.OTHER
        assert result.needs_retake is True
        assert "pothole" in result.alternatives
        assert "clearer photo" in result.guidance_message.lower()

@pytest.mark.anyio
async def test_needs_retake_on_dark_image():
    """Verify pre-analysis quality check flags extremely dark images before inference."""
    provider = GeminiVisionProvider(api_key="test-key")
    # Grayscale value 5 is nearly black
    dark_bytes = create_test_image(color=(5, 5, 5), with_noise=False)
    result = await provider.analyze(dark_bytes, mime_type="image/jpeg")

    assert result.problem_type == ProblemType.OTHER
    assert result.needs_retake is True
    assert "dark" in result.evidence[0].lower()
    assert "clearer photo" in result.guidance_message.lower()

@pytest.mark.anyio
async def test_needs_retake_on_blank_image():
    """Verify pre-analysis check catches uniform/blank images."""
    provider = GeminiVisionProvider(api_key="test-key")
    # Completely uniform image (0 standard deviation)
    blank_bytes = create_test_image(color=(220, 220, 220), with_noise=False)
    result = await provider.analyze(blank_bytes, mime_type="image/jpeg")


    assert result.problem_type == ProblemType.OTHER
    assert result.needs_retake is True
    assert "blank" in result.evidence[0].lower()

def test_gemini_timeout_handling():
    """Verify HTTP 504 with exact message when AI analysis times out."""
    with patch("app.api.analyze.get_vision_analyzer") as mock_get_analyzer:
        mock_analyzer = MagicMock()
        async def mock_timeout(*args, **kwargs):
            raise TimeoutError("AI analysis timed out. Please try again.")
        mock_analyzer.analyze = mock_timeout
        mock_get_analyzer.return_value = mock_analyzer

        img_bytes = create_test_image()
        res = client.post(
            "/api/analyze",
            files={"file": ("test.jpg", img_bytes, "image/jpeg")}
        )
        assert res.status_code == 504
        assert res.json()["detail"] == "AI analysis timed out. Please try again."

def test_gemini_rate_limit_handling():
    """Verify HTTP 429 with exact message when rate limit or quota exceeded."""
    with patch("app.api.analyze.get_vision_analyzer") as mock_get_analyzer:
        mock_analyzer = MagicMock()
        async def mock_quota(*args, **kwargs):
            raise RuntimeError("429 ResourceExhausted: quota limit exceeded")
        mock_analyzer.analyze = mock_quota
        mock_get_analyzer.return_value = mock_analyzer

        img_bytes = create_test_image()
        res = client.post(
            "/api/analyze",
            files={"file": ("test.jpg", img_bytes, "image/jpeg")}
        )
        assert res.status_code == 429
        assert res.json()["detail"] == "AI analysis is temporarily unavailable. Please try again."

def test_unsupported_image_mime():
    """Verify HTTP 400 when non-image format is uploaded."""
    res = client.post(
        "/api/analyze",
        files={"file": ("notes.pdf", b"%PDF-1.4...", "application/pdf")}
    )
    assert res.status_code == 400
    assert "Unsupported image format" in res.json()["detail"]

@pytest.mark.anyio
async def test_corrupted_image_handling():
    """Verify corrupted image bytes return needs_retake=True without crash."""
    provider = GeminiVisionProvider(api_key="test-key")
    corrupt_bytes = b"not-a-valid-image-stream-bytes"
    result = await provider.analyze(corrupt_bytes, mime_type="image/jpeg")

    assert result.problem_type == ProblemType.OTHER
    assert result.needs_retake is True
    assert "clearer photo" in result.guidance_message.lower()

def test_citizen_override_flow():
    """Verify that citizen edits to AI categorization and severity are preserved upon complaint filing."""
    override_payload = {
        "problem_type": "drain",        # Citizen changed from pothole to drain
        "confidence": 0.88,
        "severity": "CRITICAL",          # Citizen changed severity to CRITICAL
        "evidence": ["Blocked gutter causing foul overflow"],
        "latitude": 28.6150,
        "longitude": 77.2100,
        "location_name": "Janpath Road",
        "department": "Drainage / Sanitation",
        "description": "Citizen adjusted category and marked critical due to health hazard.",
        "image_url": "/api/complaints/image/test-drain.jpg"
    }

    res = client.post("/api/complaints", json=override_payload)
    assert res.status_code == 201
    data = res.json()
    assert data["problem_type"] == "drain"
    assert data["severity"] == "CRITICAL"
    assert data["department"] == "Drainage / Sanitation"
    assert data["description"] == override_payload["description"]

def test_supabase_private_storage_upload_and_controlled_access():
    """Verify upload returns controlled reference and image endpoint streams bytes."""
    img_bytes = create_test_image(color=(80, 120, 160))

    # 1. Upload
    upload_res = client.post(
        "/api/complaints/upload",
        files={"file": ("civic_issue.jpg", img_bytes, "image/jpeg")}
    )
    assert upload_res.status_code == 200
    image_url = upload_res.json()["image_url"]
    assert image_url.startswith("/api/complaints/image/")
    filename = image_url.replace("/api/complaints/image/", "")

    # 2. Controlled access retrieval
    get_img_res = client.get(f"/api/complaints/image/{filename}")
    assert get_img_res.status_code == 200
    assert get_img_res.headers["content-type"] == "image/jpeg"
    assert len(get_img_res.content) == len(img_bytes)

    # 3. Signed URL endpoint check
    signed_res = client.get(f"/api/complaints/image/{filename}/signed-url")
    assert signed_res.status_code == 200
    assert "signed_url" in signed_res.json()


# ============================================================================
# PHASE 3 TESTS: AUTHORITY DASHBOARD, MAP, HOTSPOTS, TRENDS & DUPLICATES
# ============================================================================

def test_phase3_dashboard_statistics():
    """Verify statistics aggregates counts, daily trends, and hotspots accurately."""
    res = client.get("/api/dashboard/statistics")
    assert res.status_code == 200
    data = res.json()
    assert "total_reports" in data
    assert "high_critical" in data
    assert "pending" in data
    assert "in_progress" in data
    assert "resolved" in data
    assert "by_category" in data
    assert "daily_trends" in data
    assert len(data["daily_trends"]) == 7
    assert len(data["hotspots"]) >= 3

def test_phase3_filtered_complaints_by_category():
    """Verify filtering complaints by category returns only matching items."""
    res = client.get("/api/complaints?problem_type=pothole")
    assert res.status_code == 200
    items = res.json()
    assert len(items) > 0
    assert all(c["problem_type"] == "pothole" for c in items)

def test_phase3_filtered_complaints_by_severity():
    """Verify filtering complaints by severity level."""
    res = client.get("/api/complaints?severity=CRITICAL")
    assert res.status_code == 200
    items = res.json()
    assert len(items) > 0
    assert all(c["severity"] == "CRITICAL" for c in items)

def test_phase3_filtered_complaints_by_status():
    """Verify filtering complaints by lifecycle status."""
    res = client.get("/api/complaints?status=REPORTED")
    assert res.status_code == 200
    items = res.json()
    assert len(items) > 0
    assert all(c["status"] == "REPORTED" for c in items)

def test_phase3_filtered_complaints_by_department():
    """Verify filtering complaints by department."""
    res = client.get("/api/complaints?department=Municipal Roads")
    assert res.status_code == 200
    items = res.json()
    assert len(items) > 0
    assert all(c["department"] == "Municipal Roads" for c in items)

def test_phase3_hotspot_calculation():
    """Verify spatial corridor clustering computes centroids, dominant issue, and decision support."""
    from app.core.database import calculate_hotspots
    test_reports = [
        {"id": "t1", "report_id": "NGD-T1", "problem_type": "pothole", "severity": "HIGH", "status": "REPORTED", "latitude": 28.6315, "longitude": 77.2167},
        {"id": "t2", "report_id": "NGD-T2", "problem_type": "pothole", "severity": "CRITICAL", "status": "IN_PROGRESS", "latitude": 28.6320, "longitude": 77.2170},
        {"id": "t3", "report_id": "NGD-T3", "problem_type": "pothole", "severity": "MEDIUM", "status": "REPORTED", "latitude": 28.6325, "longitude": 77.2172},
    ]
    hotspots = calculate_hotspots(test_reports)
    assert len(hotspots) == 1
    hs = hotspots[0]
    assert "Pothole" in hs["dominant_issue"]
    assert hs["total_reports"] == 3
    assert hs["high_critical_count"] == 2
    assert hs["unresolved_count"] == 3
    assert len(hs["report_ids"]) == 3
    assert "Inspect" in hs["suggested_action"]

def test_phase3_duplicate_flagging():
    """Verify that reporting a duplicate civic issue near an existing one flags duplicate_of."""
    base_payload = {
        "problem_type": "pothole",
        "confidence": 0.91,
        "severity": "HIGH",
        "evidence": ["Asphalt crater"],
        "latitude": 28.6200,
        "longitude": 77.2100,
        "location_name": "Connaught Place Radial 1",
        "department": "Municipal Roads",
        "description": "Original report",
        "image_url": "https://example.com/pothole1.jpg"
    }
    r1 = client.post("/api/complaints", json=base_payload)
    assert r1.status_code == 201
    parent_id = r1.json()["report_id"]

    # Submit second report within 15 meters
    dup_payload = {
        "problem_type": "pothole",
        "confidence": 0.89,
        "severity": "HIGH",
        "evidence": ["Road depression"],
        "latitude": 28.62005,
        "longitude": 77.21005,
        "location_name": "Connaught Place Radial 1 nearby",
        "department": "Municipal Roads",
        "description": "Duplicate report",
        "image_url": "https://example.com/pothole2.jpg"
    }
    r2 = client.post("/api/complaints", json=dup_payload)
    assert r2.status_code == 201
    dup_data = r2.json()
    assert dup_data["duplicate_of"] == parent_id

def test_phase3_complaint_status_lifecycle_updates():
    """Verify lifecycle progression: REPORTED -> ASSIGNED -> IN_PROGRESS -> RESOLVED."""
    payload = {
        "problem_type": "garbage",
        "confidence": 0.95,
        "severity": "MEDIUM",
        "evidence": ["Overflowing waste"],
        "latitude": 28.6400,
        "longitude": 77.2300,
        "location_name": "Market Area",
        "department": "Sanitation",
        "description": "Lifecycle test",
        "image_url": "https://example.com/waste.jpg"
    }
    c_res = client.post("/api/complaints", json=payload)
    rep_id = c_res.json()["report_id"]

    for next_st in ["ASSIGNED", "IN_PROGRESS", "RESOLVED"]:
        p_res = client.patch(f"/api/complaints/{rep_id}/status", json={"status": next_st})
        assert p_res.status_code == 200
        assert p_res.json()["status"] == next_st

    # Invalid status should return 422
    inv_res = client.patch(f"/api/complaints/{rep_id}/status", json={"status": "INVALID_STATUS"})
    assert inv_res.status_code == 422

def test_phase3_heatmap_endpoint():
    """Verify /api/dashboard/heatmap returns weighted geospatial points."""
    res = client.get("/api/dashboard/heatmap")
    assert res.status_code == 200
    points = res.json()
    assert isinstance(points, list)
    assert len(points) > 0
    p = points[0]
    assert "latitude" in p
    assert "longitude" in p
    assert "weight" in p
    assert 0 < p["weight"] <= 1.0
    assert p["weight"] in [0.35, 0.60, 0.85, 1.00]

def test_phase3_empty_dashboard_handling():
    """Verify statistics and hotspot calculations gracefully handle 0 reports."""
    from app.core.database import calculate_statistics
    empty_stats = calculate_statistics([])
    assert empty_stats["total_reports"] == 0
    assert empty_stats["high_critical"] == 0
    assert empty_stats["pending"] == 0
    assert empty_stats["in_progress"] == 0
    assert empty_stats["resolved"] == 0
    assert empty_stats["hotspots"] == []
    assert len(empty_stats["daily_trends"]) == 7

def test_phase3_seeded_demo_data_integrity():
    """Verify the deterministic seeded demo dataset contains meaningful clusters and multiple categories."""
    from app.core.database import INITIAL_DEMO_COMPLAINTS
    assert len(INITIAL_DEMO_COMPLAINTS) >= 15
    categories = {c["problem_type"] for c in INITIAL_DEMO_COMPLAINTS}
    assert {"pothole", "garbage", "streetlight", "drain"}.issubset(categories)
    severities = {c["severity"] for c in INITIAL_DEMO_COMPLAINTS}
    assert {"CRITICAL", "HIGH", "MEDIUM", "LOW"}.issubset(severities)
    statuses = {c["status"] for c in INITIAL_DEMO_COMPLAINTS}
    assert {"REPORTED", "ASSIGNED", "IN_PROGRESS", "RESOLVED"}.issubset(statuses)
    # At least one duplicate
    assert any(c.get("duplicate_of") for c in INITIAL_DEMO_COMPLAINTS)

def test_phase3_citizen_to_authority_flow():
    """End-to-end integration: citizen creates complaint -> appears in authority list -> authority updates status."""
    # 1. Citizen creates complaint
    new_report = {
        "problem_type": "streetlight",
        "confidence": 0.88,
        "severity": "CRITICAL",
        "evidence": ["Exposed high-voltage wire at pedestrian crossing"],
        "latitude": 28.6250,
        "longitude": 77.2050,
        "location_name": "Ashoka Road Pedestrian Crossing",
        "department": "Electrical / Municipal Lighting",
        "description": "Urgent sparking hazard",
        "image_url": "/api/complaints/image/wire_hazard.jpg"
    }
    sub_res = client.post("/api/complaints", json=new_report)
    assert sub_res.status_code == 201
    created = sub_res.json()
    rep_id = created["report_id"]

    # 2. Authority gets complaints
    auth_res = client.get("/api/complaints")
    assert auth_res.status_code == 200
    all_reps = auth_res.json()
    found = any(c["report_id"] == rep_id for c in all_reps)
    assert found is True

    # 3. Authority assigns complaint to crew
    up_res = client.patch(f"/api/complaints/{rep_id}/status", json={"status": "ASSIGNED"})
    assert up_res.status_code == 200
    assert up_res.json()["status"] == "ASSIGNED"

    # 4. Authority checks updated statistics
    stats_res = client.get("/api/dashboard/statistics")
    assert stats_res.status_code == 200
    assert stats_res.json()["total_reports"] >= 16

def test_phase4_reset_demo_dataset():
    """Verify POST /api/dashboard/reset-demo resets seeded demo items without deleting user reports."""
    # 1. Add user report
    user_payload = {
        "problem_type": "pothole",
        "confidence": 0.89,
        "severity": "MEDIUM",
        "evidence": ["Street depression"],
        "latitude": 28.6140,
        "longitude": 77.2095,
        "location_name": "Test User Report Location",
        "department": "Municipal Roads",
        "description": "User created complaint to verify retention across resets",
        "image_url": "https://example.com/user_pothole.jpg"
    }
    c_res = client.post("/api/complaints", json=user_payload)
    assert c_res.status_code == 201
    user_rep_id = c_res.json()["report_id"]

    # 2. Call reset-demo
    reset_res = client.post("/api/dashboard/reset-demo")
    assert reset_res.status_code == 200
    res_data = reset_res.json()
    assert res_data["status"] == "success"
    assert res_data["demo_count"] >= 16
    assert res_data["user_preserved_count"] >= 1

    # 3. Verify user report is still retrievable
    get_user = client.get(f"/api/complaints/{user_rep_id}")
    assert get_user.status_code == 200
    assert get_user.json()["report_id"] == user_rep_id


