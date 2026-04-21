from datetime import datetime, timedelta, timezone
from typing import Any

from app.db.supabase_client import get_supabase_admin_client

WEATHER_CACHE_TABLE = "weather_cache"
DEFAULT_FRESHNESS_MINUTES = 30
DEFAULT_STORM_WINDOW_HOURS = 72
DEFAULT_DRYING_WINDOW_HOURS = 8


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_supabase_client():
    return get_supabase_admin_client()


def get_weather_cache_row(cache_key: str) -> dict[str, Any] | None:
    client = get_supabase_client()
    if not client:
        return None

    res = (
        client.table(WEATHER_CACHE_TABLE)
        .select("*")
        .eq("cache_key", cache_key)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else None


def get_any_weather_cache_payload(cache_key: str) -> dict[str, Any] | None:
    row = get_weather_cache_row(cache_key)
    if not row:
        return None
    return row.get("payload")


def get_fresh_weather_cache_payload(
    cache_key: str,
    freshness_minutes: int = DEFAULT_FRESHNESS_MINUTES,
) -> dict[str, Any] | None:
    row = get_weather_cache_row(cache_key)
    if not row:
        return None

    expires_at = parse_dt(row.get("expires_at"))
    if expires_at and utc_now() > expires_at:
        return None

    updated_at = parse_dt(row.get("updated_at"))
    if not updated_at:
        return None

    age = utc_now() - updated_at
    if age > timedelta(minutes=freshness_minutes):
        return None

    return row.get("payload")


def upsert_weather_cache_payload(
    cache_key: str,
    payload: dict[str, Any],
    *,
    status: str | None = None,
    ttl_seconds: int | None = None,
) -> dict[str, Any] | None:
    client = get_supabase_client()
    if not client:
        return None

    now = utc_now()
    effective_ttl_seconds = ttl_seconds if ttl_seconds is not None else DEFAULT_FRESHNESS_MINUTES * 60
    expires_at = now + timedelta(seconds=effective_ttl_seconds)

    record = {
        "cache_key": cache_key,
        "payload": payload,
        "status": status or "fresh",
        "expires_at": expires_at.isoformat(),
        "updated_at": now.isoformat(),
    }

    res = (
        client.table(WEATHER_CACHE_TABLE)
        .upsert(record, on_conflict="cache_key")
        .execute()
    )
    rows = res.data or []
    return rows[0] if rows else record


def upsert_weather_cache(
    *,
    cache_key: str,
    payload: dict[str, Any],
    status: str | None = None,
    ttl_seconds: int | None = None,
) -> dict[str, Any] | None:
    enriched_payload = {
        **payload,
        "cache_status": status,
        "ttl_seconds": ttl_seconds,
    }
    return upsert_weather_cache_payload(
        cache_key,
        enriched_payload,
        status=status,
        ttl_seconds=ttl_seconds,
    )


def normalize_current_weather_payload(payload: dict[str, Any] | None) -> dict[str, Any]:
    payload = payload or {}

    summary = payload.get("raw_summary") or payload.get("summary")
    explicit_flag = payload.get("is_raining_now")

    if isinstance(explicit_flag, bool):
        is_raining_now = explicit_flag
    else:
        text = str(summary or "").lower()
        wet_terms = ("rain", "drizzle", "storm", "thunder", "shower", "precip")
        is_raining_now = any(term in text for term in wet_terms)

    return {
        **payload,
        "summary": payload.get("summary"),
        "raw_summary": payload.get("raw_summary"),
        "is_raining_now": is_raining_now,
    }


def normalize_recent_rain_payload(payload: dict[str, Any] | None) -> dict[str, Any]:
    payload = payload or {}

    storm_rain_total_inches = float(payload.get("storm_rain_total_inches", 0) or 0)
    hours_since_rain_stopped = payload.get("hours_since_rain_stopped")
    drying_window_established = bool(payload.get("drying_window_established", False))
    effective_drying_hours = float(payload.get("effective_drying_hours", 0) or 0)

    return {
        **payload,
        "storm_rain_total_inches": storm_rain_total_inches,
        "hours_since_rain_stopped": hours_since_rain_stopped,
        "drying_window_established": drying_window_established,
        "effective_drying_hours": effective_drying_hours,
        "unavailable": bool(payload.get("unavailable", False)),
    }


def build_recent_rain_payload_from_hourly(
    hourly_rain_points: list[dict[str, Any]],
    *,
    now: datetime | None = None,
    storm_window_hours: int = DEFAULT_STORM_WINDOW_HOURS,
    drying_window_hours: int = DEFAULT_DRYING_WINDOW_HOURS,
) -> dict[str, Any]:
    now = now or utc_now()
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    storm_start_cutoff = now - timedelta(hours=storm_window_hours)

    normalized_points: list[dict[str, Any]] = []
    for point in hourly_rain_points:
        timestamp = parse_dt(point.get("timestamp"))
        if not timestamp:
            continue
        if timestamp.tzinfo is None:
            timestamp = timestamp.replace(tzinfo=timezone.utc)
        if timestamp < storm_start_cutoff:
            continue

        rain_inches = float(point.get("rain_inches", 0) or 0)
        normalized_points.append(
            {
                "timestamp": timestamp,
                "rain_inches": rain_inches,
            }
        )

    if not normalized_points:
        return {
            "storm_rain_total_inches": 0.0,
            "hours_since_rain_stopped": None,
            "drying_window_established": False,
            "effective_drying_hours": 0.0,
            "unavailable": False,
        }

    normalized_points.sort(key=lambda item: item["timestamp"], reverse=True)

    storm_rain_total_inches = sum(item["rain_inches"] for item in normalized_points)

    most_recent_rain_timestamp: datetime | None = None
    for item in normalized_points:
        if item["rain_inches"] > 0:
            most_recent_rain_timestamp = item["timestamp"]
            break

    if not most_recent_rain_timestamp:
        return {
            "storm_rain_total_inches": 0.0,
            "hours_since_rain_stopped": float(storm_window_hours),
            "drying_window_established": True,
            "effective_drying_hours": float(max(0, storm_window_hours - drying_window_hours)),
            "unavailable": False,
        }

    hours_since_rain_stopped = max(
        0.0,
        (now - most_recent_rain_timestamp).total_seconds() / 3600,
    )

    drying_window_established = hours_since_rain_stopped >= drying_window_hours
    effective_drying_hours = max(0.0, hours_since_rain_stopped - drying_window_hours)

    return {
        "storm_rain_total_inches": round(storm_rain_total_inches, 3),
        "hours_since_rain_stopped": round(hours_since_rain_stopped, 2),
        "drying_window_established": drying_window_established,
        "effective_drying_hours": round(effective_drying_hours, 2),
        "unavailable": False,
    }


def build_unavailable_recent_rain_payload() -> dict[str, Any]:
    return {
        "storm_rain_total_inches": 0.0,
        "hours_since_rain_stopped": None,
        "drying_window_established": False,
        "effective_drying_hours": 0.0,
        "unavailable": True,
    }