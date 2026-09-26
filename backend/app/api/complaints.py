import logging
from typing import List, Optional
from fastapi import APIRouter, File, HTTPException, Query, Response, UploadFile, status

from app.core.database import db
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintResponse,
    ComplaintStatus,
    ComplaintUpdateStatus
)
from app.services.storage_service import storage_service

router = APIRouter(prefix="/complaints", tags=["Complaints"])
logger = logging.getLogger(__name__)

SUPPORTED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}

@router.post("/upload", response_model=dict)
async def upload_complaint_image(file: UploadFile = File(...)):
    """
    Upload complaint photograph to private Supabase Storage.
    Returns controlled backend reference URL.
    """
    content_type = file.content_type or "image/jpeg"
    if content_type.lower() not in SUPPORTED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image format. Allowed: JPG, PNG, WEBP."
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty image file received.")

    image_url = await storage_service.upload_image(file_bytes, mime_type=content_type)
    return {"image_url": image_url}

@router.get("/image/{filename}")
async def get_complaint_image(filename: str):
    """
    Controlled image retrieval from private storage.
    Enforces server-side credentials and provides secure streaming to authorized clients.
    """
    image_data = await storage_service.get_image_bytes(filename)
    if not image_data:
        raise HTTPException(status_code=404, detail="Image not found.")

    data_bytes, mime_type = image_data
    return Response(content=data_bytes, media_type=mime_type)

@router.get("/image/{filename}/signed-url", response_model=dict)
async def get_image_signed_url(filename: str, expires_in: int = 3600):
    """
    Generates a short-lived signed URL for direct private storage access.
    """
    signed_url = await storage_service.create_signed_url(filename, expires_in)
    if not signed_url:
        return {"signed_url": f"/api/complaints/image/{filename}"}
    return {"signed_url": signed_url}

@router.post("", response_model=ComplaintResponse, status_code=status.HTTP_201_CREATED)
async def create_complaint(payload: ComplaintCreate):
    """
    Register a confirmed citizen complaint.
    Stores record in Supabase PostgreSQL, checks for duplicate, assigns report_id.
    """
    try:
        created = await db.create_complaint(payload.model_dump())
        return created
    except Exception as e:
        logger.error(f"Error creating complaint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register complaint. Please try again."
        )

@router.get("", response_model=List[ComplaintResponse])
async def list_complaints(
    problem_type: Optional[str] = Query(None, description="Filter by problem type"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    status: Optional[str] = Query(None, description="Filter by complaint status"),
    department: Optional[str] = Query(None, description="Filter by department"),
    limit: int = Query(100, ge=1, le=500)
):
    """
    List civic complaints with multi-criteria filtering.
    """
    try:
        results = await db.get_complaints(
            problem_type=problem_type,
            severity=severity,
            status=status,
            department=department,
            limit=limit
        )
        return results
    except Exception as e:
        logger.error(f"Error listing complaints: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve complaints.")

@router.get("/{id}", response_model=ComplaintResponse)
async def get_complaint(id: str):
    """
    Fetch complaint by unique UUID or Report ID (e.g. NGD-2026-00101).
    """
    complaint = await db.get_complaint_by_id(id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint report not found.")
    return complaint

@router.patch("/{id}/status", response_model=ComplaintResponse)
async def update_complaint_status(id: str, update: ComplaintUpdateStatus):
    """
    Update complaint lifecycle status (REPORTED -> ASSIGNED -> IN_PROGRESS -> RESOLVED).
    Used by municipal authorities on the dashboard.
    """
    updated = await db.update_complaint_status(id, update.status.value)
    if not updated:
        raise HTTPException(status_code=404, detail="Complaint not found.")
    return updated
