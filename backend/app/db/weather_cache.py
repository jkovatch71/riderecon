from datetime import datetime, timezone
from typing import Any

from app.db.supabase_client import get_supabase_admin_client


TABLE_NAME = "weather_cache"


def get_weather_cache_row(cache_key: str) -> dict[str, Any] | None:
    client = get_supabase_admin_client()
    if client is None:
        return None

    try:
        response = (
            client.table(TABLE_NAME)
            .select("cache_key, payload, status, expires_at, updated_at")
            .eq("cache_key", cache_key)
            .maybe_single()
            .execute()
        )
        return response.data if response else None
    except Exception as e:
        print(f"get_weather_cache_row failed for {cache_key}: {e}")
        return None


def get_fresh_weather_cache_payload(cache_key: str) -> dict[str, Any] | None:
    row = get_weather_cache_row(cache_key)
    if not row:
        return None

    expires_at_raw = row.get("expires_at")
    payload = row.get("payload")

    if not expires_at_raw or not isinstance(payload, dict):
        return None

    try:
        expires_at = datetime.fromisoformat(str(expires_at_raw).replace("Z", "+00:00"))
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
    except Exception:
        return None

    if datetime.now(timezone.utc) >= expires_at:
        return None

    return payload


def get_any_weather_cache_payload(cache_key: str) -> dict[str, Any] | None:
    row = get_weather_cache_row(cache_key)
    if not row:
        return None

    payload = row.get("payload")
    return payload if isinstance(payload, dict) else None


def upsert_weather_cache(
    *,
    cache_key: str,
    payload: dict[str, Any],
    status: str,
    ttl_seconds: int,
) -> None:
    client = get_supabase_admin_client()
    if client is None:
        return

    now = datetime.now(timezone.utc)
    expires_at = now.timestamp() + ttl_seconds

    row = {
        "cache_key": cache_key,
        "payload": payload,
        "status": status,
        "expires_at": datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat(),
        "updated_at": now.isoformat(),
    }

    try:
        client.table(TABLE_NAME).upsert(row).execute()
    except Exception as e:
        print(f"upsert_weather_cache failed for {cache_key}: {e}")