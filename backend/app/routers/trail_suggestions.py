from fastapi import APIRouter, Depends, Header, HTTPException
import httpx

from app.core.config import settings
from app.db.supabase_client import get_supabase_admin_client
from app.schemas.trail_suggestions import TrailSuggestionCreate

router = APIRouter(prefix="/trail-suggestions", tags=["trail-suggestions"])


async def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing auth token")

    token = authorization.replace("Bearer ", "").strip()

    async with httpx.AsyncClient(timeout=15.0) as http_client:
        res = await http_client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_service_role_key,
            },
        )

    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid token")

    return res.json()


def get_admin_client():
    client = get_supabase_admin_client()
    if not client:
        raise HTTPException(
            status_code=500,
            detail="Supabase admin client is not configured",
        )
    return client


def get_profile_username(user_id: str) -> str | None:
    client = get_admin_client()

    res = (
        client.table("profiles")
        .select("username")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )

    if not res.data:
        return None

    return res.data.get("username")


@router.post("")
async def create_trail_suggestion(
    payload: TrailSuggestionCreate,
    user=Depends(get_current_user),
):
    user_id = user.get("id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user")

    client = get_admin_client()
    username = get_profile_username(user_id)

    try:
        res = (
            client.table("trail_suggestions")
            .insert(
                {
                    "user_id": user_id,
                    "username": username or "rider",
                    "trail_name": payload.trail_name.strip(),
                    "system_name": payload.system_name.strip()
                    if payload.system_name
                    else None,
                    "city": payload.city.strip() if payload.city else None,
                    "state": payload.state.strip() if payload.state else "TX",
                    "latitude": payload.latitude,
                    "longitude": payload.longitude,
                    "location_accuracy_meters": payload.location_accuracy_meters,
                    "notes": payload.notes.strip() if payload.notes else None,
                    "status": "pending",
                }
            )
            .execute()
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create trail suggestion: {str(e)}",
        )

    rows = res.data or []

    return {
        "message": "Trail suggestion submitted.",
        "suggestion": rows[0] if rows else None,
    }