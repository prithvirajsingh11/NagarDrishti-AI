import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api import analyze, complaints, dashboard, departments

# Ensure local upload dir exists (with fallback for serverless read-only environments)
upload_dir = settings.UPLOAD_DIR
try:
    Path(upload_dir).mkdir(parents=True, exist_ok=True)
except Exception:
    upload_dir = "/tmp/uploads"
    try:
        Path(upload_dir).mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI-Powered Civic Intelligence - Decision-Support Platform for Citizens & Municipal Authorities",
    version=settings.VERSION,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local upload directory for image serving
app.mount("/storage", StaticFiles(directory=upload_dir), name="storage")

# Include API Routers under /api prefix
app.include_router(analyze.router, prefix=settings.API_V1_PREFIX)
app.include_router(complaints.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(departments.router, prefix=settings.API_V1_PREFIX)

@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "tagline": "AI-Powered Civic Intelligence",
        "version": settings.VERSION,
        "status": "online",
        "ai_provider": settings.AI_PROVIDER,
        "docs": "/api/docs"
    }

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "provider": settings.AI_PROVIDER
    }
