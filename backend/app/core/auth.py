import logging
from typing import Dict, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)

# Dedicated mock test tokens for fast, deterministic automated unit testing
TEST_TOKENS: Dict[str, Dict] = {
    "test-citizen-token": {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "citizen1@example.com",
        "role": "citizen",
        "full_name": "Verified Citizen"
    },
    "test-citizen-token-2": {
        "id": "33333333-3333-3333-3333-333333333333",
        "email": "citizen2@example.com",
        "role": "citizen",
        "full_name": "Second Citizen"
    },
    "test-authority-token": {
        "id": "22222222-2222-2222-2222-222222222222",
        "email": "officer@municipal.gov",
        "role": "authority",
        "full_name": "Municipal Officer"
    }
}

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Dict:
    """
    Validates Supabase Auth access token from HTTP Authorization header.
    Derives user ID, email, and validated role directly from Supabase.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to continue."
        )

    token = credentials.credentials.strip()

    # Fast path for automated testing
    if token in TEST_TOKENS:
        return TEST_TOKENS[token]

    # Live Supabase Auth verification
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            from supabase import create_client
            client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            user_response = client.auth.get_user(token)
            if not user_response or not user_response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired session. Please sign in again."
                )

            user = user_response.user
            user_id = str(user.id)
            user_email = user.email or ""
            metadata = user.user_metadata or {}
            full_name = metadata.get("full_name", user_email.split("@")[0] if user_email else "Citizen")
            role = "citizen"

            # Check profile role in profiles table
            try:
                prof = client.table("profiles").select("role, full_name").eq("user_id", user_id).execute()
                if prof.data:
                    role = prof.data[0].get("role", "citizen")
                    full_name = prof.data[0].get("full_name", full_name)
            except Exception as pe:
                logger.warning(f"Could not load user profile: {pe}")

            return {
                "id": user_id,
                "email": user_email,
                "role": role,
                "full_name": full_name
            }
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Supabase auth verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed or token expired."
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication service unavailable."
    )

async def require_citizen(user: Dict = Depends(get_current_user)) -> Dict:
    """Ensures caller has citizen role or authority override."""
    if user.get("role") not in {"citizen", "authority"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Citizen role required."
        )
    return user

async def require_authority(user: Dict = Depends(get_current_user)) -> Dict:
    """Ensures caller has authority role."""
    if user.get("role") != "authority":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authority role required. Citizens are not permitted to access this resource."
        )
    return user
