import os
import re
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException

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


def get_admin_client():
    client = get_supabase_admin_client()

    if not client:
        raise HTTPException(status_code=500, detail="Supabase client unavailable")

    return client


def slugify(value: str) -> str:
    cleaned = value.strip().lower()
    cleaned = re.sub(r"[^a-z0-9]+", "-", cleaned)
    cleaned = re.sub(r"-+", "-", cleaned).strip("-")
    return cleaned or "trail"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def clean_text(value: Any) -> str | None:
    if value is None:
        return None

    cleaned = str(value).strip()
    return cleaned or None


@router.get("/me")
def get_admin_status(admin=Depends(get_admin_user)):
    return {
        "is_admin": True,
        "email": admin.get("email"),
    }


@router.post("/weather/clear")
def clear_weather_cache(_admin=Depends(get_admin_user)):
    client = get_admin_client()
    client.table("weather_cache").delete().neq("cache_key", "").execute()

    return {"message": "Weather cache cleared"}


@router.post("/weather/refresh")
def refresh_weather(_admin=Depends(get_admin_user)):
    return {
        "message": "Weather refresh ready. Clear cache, then reload weather endpoints."
    }


@router.get("/trail-suggestions")
def list_trail_suggestions(_admin=Depends(get_admin_user)):
    client = get_admin_client()

    res = (
        client.table("trail_suggestions")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )

    return res.data or []


@router.post("/trail-suggestions/{suggestion_id}/approve")
def approve_trail_suggestion(
    suggestion_id: str,
    _admin=Depends(get_admin_user),
):
    client = get_admin_client()
    timestamp = now_iso()

    suggestion_res = (
        client.table("trail_suggestions")
        .select("*")
        .eq("id", suggestion_id)
        .limit(1)
        .execute()
    )

    suggestions = suggestion_res.data or []

    if not suggestions:
        raise HTTPException(status_code=404, detail="Trail suggestion not found")

    suggestion = suggestions[0]
    current_status = clean_text(suggestion.get("status")) or "pending"

    if current_status == "approved":
        raise HTTPException(status_code=409, detail="Trail suggestion already approved")

    trail_name = clean_text(suggestion.get("trail_name"))

    if not trail_name:
        raise HTTPException(status_code=400, detail="Trail suggestion is missing name")

    latitude = suggestion.get("latitude")
    longitude = suggestion.get("longitude")

    if latitude is None or longitude is None:
        update_res = (
            client.table("trail_suggestions")
            .update(
                {
                    "status": "needs_location",
                    "updated_at": timestamp,
                }
            )
            .eq("id", suggestion_id)
            .execute()
        )

        raise HTTPException(
            status_code=400,
            detail="Trail suggestion needs GPS coordinates before approval.",
        )

    trail_id = slugify(trail_name)

    existing_res = (
        client.table("trails")
        .select("id")
        .eq("id", trail_id)
        .limit(1)
        .execute()
    )

    if existing_res.data:
        client.table("trail_suggestions").update(
            {
                "status": "duplicate",
                "updated_at": timestamp,
            }
        ).eq("id", suggestion_id).execute()

        raise HTTPException(
            status_code=409,
            detail=f"Trail already exists with id: {trail_id}",
        )

    trail_payload = {
        "id": trail_id,
        "name": trail_name,
        "alias": None,
        "system_name": clean_text(suggestion.get("system_name")) or trail_name,
        "city": clean_text(suggestion.get("city")) or "San Antonio",
        "state": clean_text(suggestion.get("state")) or "TX",
        "latitude": latitude,
        "longitude": longitude,
        "status_color": "yellow",
        "current_condition": "Unknown",
        "last_reported_at": None,
        "report_count": 0,
        "is_active": True,
        "created_at": timestamp,
        "updated_at": timestamp,
    }

    trail_res = client.table("trails").insert(trail_payload).execute()
    trail_rows = trail_res.data or []

    recovery_payload = {
        "trail_id": trail_id,
        "recovery_class": "average",
        "average_recovery_hours": 8,
        "recovery_confidence": "low",
        "rain_events_observed": 0,
        "notes": "Starter estimate created from approved trail suggestion.",
        "updated_at": timestamp,
    }

    client.table("trail_recovery_profiles").upsert(
        recovery_payload,
        on_conflict="trail_id",
    ).execute()

    update_res = (
        client.table("trail_suggestions")
        .update(
            {
                "status": "approved",
                "updated_at": timestamp,
            }
        )
        .eq("id", suggestion_id)
        .execute()
    )

    updated_suggestions = update_res.data or []

    return {
        "message": "Trail suggestion approved.",
        "trail": trail_rows[0] if trail_rows else trail_payload,
        "suggestion": updated_suggestions[0] if updated_suggestions else None,
    }


@router.post("/trail-suggestions/{suggestion_id}/reject")
def reject_trail_suggestion(
    suggestion_id: str,
    _admin=Depends(get_admin_user),
):
    client = get_admin_client()
    timestamp = now_iso()

    res = (
        client.table("trail_suggestions")
        .update(
            {
                "status": "rejected",
                "updated_at": timestamp,
            }
        )
        .eq("id", suggestion_id)
        .execute()
    )

    rows = res.data or []

    if not rows:
        raise HTTPException(status_code=404, detail="Trail suggestion not found")

    return {
        "message": "Trail suggestion rejected.",
        "suggestion": rows[0],
    }