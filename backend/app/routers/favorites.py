from fastapi import APIRouter, Header, HTTPException, Depends
from dotenv import load_dotenv
from pathlib import Path
import httpx
import os

from app.db.supabase_client import get_supabase_admin_client

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

router = APIRouter(prefix="/favorites", tags=["favorites"])
client = get_supabase_admin_client()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing auth token")

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase auth environment variables are missing")

    token = authorization.replace("Bearer ", "")

    async with httpx.AsyncClient() as http_client:
        res = await http_client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
            },
        )

    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid token")

    return res.json()


@router.get("")
async def list_favorites(user=Depends(get_current_user)):
    user_id = user.get("id")

    if not client:
        return []

    res = (
        client.table("favorite_trails")
        .select("trail_id")
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )

    rows = res.data or []
    return [row["trail_id"] for row in rows]


@router.post("/{trail_id}")
async def add_favorite(trail_id: str, user=Depends(get_current_user)):
    user_id = user.get("id")

    if not client:
        return {"message": "Favorite added", "trail_id": trail_id}

    client.table("favorite_trails").upsert(
        {
            "user_id": user_id,
            "trail_id": trail_id,
        }
    ).execute()

    return {"message": "Favorite added", "trail_id": trail_id}


@router.delete("/{trail_id}")
async def remove_favorite(trail_id: str, user=Depends(get_current_user)):
    user_id = user.get("id")

    if not client:
        return {"message": "Favorite removed", "trail_id": trail_id}

    (
        client.table("favorite_trails")
        .delete()
        .eq("user_id", user_id)
        .eq("trail_id", trail_id)
        .execute()
    )

    return {"message": "Favorite removed", "trail_id": trail_id}