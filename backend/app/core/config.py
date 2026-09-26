import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "NagarDrishti AI"
    VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api"
    
    # AI Configuration
    AI_PROVIDER: str = "gemini"  # "gemini" | "local" | "mock"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"
    AI_CONFIDENCE_THRESHOLD: float = 0.75
    
    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    STORAGE_BUCKET: str = "complaint-images"
    
    # Local fallback image upload dir
    UPLOAD_DIR: str = "uploads"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
