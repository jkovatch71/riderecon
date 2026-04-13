from fastapi import APIRouter, Header, HTTPException, Depends
import httpx

from app.core.config import settings
from app.db.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/favorites", tags=["favorites"])


async def get_current_user(authorization: str | None = Header(default=None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing auth token")

    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=500,
            detail="Supabase auth environment variables are missing",
        )

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
      raise HTTPException(status_code=500, detail="Supabase admin client is not configured")
    return client


@router.get("")
async def list_favorites(user=Depends(get_current_user)):
    user_id = user.get("id")
    client = get_admin_client()

    try:
        res = (
            client.table("favorite_trails")
            .select("trail_id")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list favorites: {str(e)}")

    rows = res.data or []
    return [row["trail_id"] for row in rows]


@router.post("/{trail_id}")
async def add_favorite(trail_id: str, user=Depends(get_current_user)):
    user_id = user.get("id")
    client = get_admin_client()

    try:
        client.table("favorite_trails").upsert(
            {
                "user_id": user_id,
                "trail_id": trail_id,
            }
        ).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add favorite: {str(e)}")

    return {"message": "Favorite added", "trail_id": trail_id}


@router.delete("/{trail_id}")
async def remove_favorite(trail_id: str, user=Depends(get_current_user)):
    user_id = user.get("id")
    client = get_admin_client()

    try:
        (
            client.table("favorite_trails")
            .delete()
            .eq("user_id", user_id)
            .eq("trail_id", trail_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove favorite: {str(e)}")

    return {"message": "Favorite removed", "trail_id": trail_id}