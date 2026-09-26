import logging
from typing import List
from fastapi import APIRouter, HTTPException

from app.core.database import db
from app.schemas.complaint import DashboardStatistics, HeatmapPoint

router = APIRouter(prefix="/dashboard", tags=["Authority Dashboard"])
logger = logging.getLogger(__name__)

@router.get("/statistics", response_model=DashboardStatistics)
async def get_dashboard_statistics():
    """
    Returns high-level KPI cards, status distributions, and Hotspot Intelligence.
    All analytics are deterministic and explainable.
    """
    try:
        stats = await db.get_dashboard_stats()
        return stats
    except Exception as e:
        logger.error(f"Error computing dashboard stats: {e}")
        raise HTTPException(status_code=500, detail="Could not compute dashboard statistics.")

@router.get("/heatmap", response_model=List[HeatmapPoint])
async def get_dashboard_heatmap():
    """
    Returns coordinate points with severity-weighted intensity for Leaflet heatmaps.
    """
    try:
        points = await db.get_heatmap_points()
        return points
    except Exception as e:
        logger.error(f"Error generating heatmap points: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve heatmap points.")

@router.post("/reset-demo")
async def reset_demo_dataset():
    """
    Resets the seeded demo dataset while preserving any real user-submitted citizen reports.
    Provided for hackathon evaluation and demonstration repeatability.
    """
    try:
        return db.reset_demo_data()
    except Exception as e:
        logger.error(f"Error resetting demo dataset: {e}")
        raise HTTPException(status_code=500, detail="Could not reset demo dataset.")
