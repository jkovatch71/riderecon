import os
import httpx
from fastapi import APIRouter, Header, HTTPException, Depends

from app.core.config import settings
from app.db.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/admin", tags=["admin"])


def admin_emails() -> set[str]:
    raw = os.getenv("ADMIN_EMAILS", "")
    return {email.strip().lower() for email in raw.split(",") if email.strip()}


async def get_admin_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing auth token")

    token = authorization.replace("Bearer ", "")

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_service_role_key,
            },
        )

    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = res.json()
    email = (user.get("email") or "").lower()

    if not email or email not in admin_emails():
        raise HTTPException(status_code=403, detail="Admin access required")

    return user


@router.post("/weather/clear")
def clear_weather_cache(_admin=Depends(get_admin_user)):
    client = get_supabase_admin_client()

    if not client:
        raise HTTPException(status_code=500, detail="Supabase client unavailable")

    client.table("weather_cache").delete().neq("cache_key", "").execute()

    return {"message": "Weather cache cleared"}


@router.post("/weather/refresh")
def refresh_weather(_admin=Depends(get_admin_user)):
    return {
        "message": "Weather refresh ready. Clear cache, then reload weather endpoints."
    }