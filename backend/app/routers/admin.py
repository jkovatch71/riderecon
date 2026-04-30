from fastapi import APIRouter
from app.db.supabase_client import get_supabase_admin_client

router = APIRouter(prefix="/admin", tags=["admin"])

client = get_supabase_admin_client()


@router.post("/weather/clear")
def clear_weather_cache():
    client.table("weather_cache").delete().neq("id", "").execute()
    return {"message": "Weather cache cleared"}


@router.post("/weather/refresh")
def refresh_weather():
    # simple trigger — your frontend already hits weather endpoints
    return {"message": "Weather refresh triggered"}