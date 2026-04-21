from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.db.weather_cache import (
    DEFAULT_DRYING_WINDOW_HOURS,
    DEFAULT_STORM_WINDOW_HOURS,
    build_recent_rain_payload_from_hourly,
    build_unavailable_recent_rain_payload,
    get_any_weather_cache_payload,
    get_fresh_weather_cache_payload,
    normalize_current_weather_payload,
    normalize_recent_rain_payload,
    upsert_weather_cache,
)

router = APIRouter(prefix="/weather", tags=["weather"])

CURRENT_CACHE_KEY = "current_weather"
RECENT_RAIN_CACHE_KEY = "recent_rain"

CURRENT_SUCCESS_TTL_SECONDS = 300       # 5 minutes
RECENT_RAIN_SUCCESS_TTL_SECONDS = 1800  # 30 minutes
RECENT_RAIN_FAILURE_TTL_SECONDS = 1800  # 30 minutes


def phrase_for_description(description: str) -> str:
    d = description.lower()

    if d == "clear sky":
        return "Not a cloud in the sky"
    if d in {"few clouds", "scattered clouds"}:
        return "A few clouds overhead"
    if d in {"broken clouds", "overcast clouds"}:
        return "Clouds hanging around"
    if "thunderstorm" in d:
        return "Storms in the area"
    if "rain" in d or "drizzle" in d:
        return "Rain moving through the area"
    if "snow" in d or "sleet" in d:
        return "Wintry weather in the area"
    if "mist" in d or "fog" in d or "haze" in d:
        return "Some low visibility out there"

    return description


@router.get("/current")
async def get_current_weather():
    cached = get_fresh_weather_cache_payload(CURRENT_CACHE_KEY)
    if cached is not None:
        return normalize_current_weather_payload(cached)

    if not settings.openweather_api_key:
        raise HTTPException(status_code=500, detail="OPENWEATHER_API_KEY is missing")

    if settings.weather_lat is None or settings.weather_lon is None:
        raise HTTPException(status_code=500, detail="WEATHER_LAT/WEATHER_LON are missing")

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {
        "lat": settings.weather_lat,
        "lon": settings.weather_lon,
        "appid": settings.openweather_api_key.strip(),
        "units": "imperial",
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.get(url, params=params)

    if res.status_code != 200:
        raise HTTPException(status_code=res.status_code, detail=res.text)

    data = res.json()

    temp = data.get("main", {}).get("temp")
    weather_items = data.get("weather", [])
    raw_description = weather_items[0].get("description") if weather_items else None

    base_payload = {
        "temperature": temp,
        "summary": phrase_for_description(raw_description) if raw_description else None,
        "raw_summary": raw_description,
        "cached_at": datetime.now(timezone.utc).isoformat(),
    }

    payload = normalize_current_weather_payload(base_payload)

    upsert_weather_cache(
        cache_key=CURRENT_CACHE_KEY,
        payload=payload,
        status="fresh",
        ttl_seconds=CURRENT_SUCCESS_TTL_SECONDS,
    )
    return payload


@router.get("/recent-rain")
async def get_recent_rain():

    # 🔍 TEMP DEBUG (remove later)
    print("APP_ENV =", settings.app_env)
    print("APP_NAME =", settings.app_name)
    print("WEATHER_WINDOW_HOURS =", settings.weather_window_hours)

    if settings.app_env != "production":
        print("CONFIG DEBUG:", settings.model_dump())

    cached = get_fresh_weather_cache_payload(RECENT_RAIN_CACHE_KEY)
    if cached is not None:
        return normalize_recent_rain_payload(cached)

    if settings.weather_lat is None or settings.weather_lon is None:
        raise HTTPException(status_code=500, detail="WEATHER_LAT/WEATHER_LON are missing")

    now = datetime.now(timezone.utc)

    storm_window_hours = (
        settings.weather_window_hours
        if settings.weather_window_hours is not None
        else DEFAULT_STORM_WINDOW_HOURS
    )
    drying_window_hours = DEFAULT_DRYING_WINDOW_HOURS

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": settings.weather_lat,
        "longitude": settings.weather_lon,
        "hourly": "precipitation",
        "past_hours": storm_window_hours,
        "forecast_hours": 1,
        "timezone": "UTC",
    }

    stale_payload = get_any_weather_cache_payload(RECENT_RAIN_CACHE_KEY)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(url, params=params)

        if res.status_code != 200:
            if stale_payload:
                fallback_payload = normalize_recent_rain_payload(
                    {
                        **stale_payload,
                        "cached_at": datetime.now(timezone.utc).isoformat(),
                        "unavailable": True,
                    }
                )
                upsert_weather_cache(
                    cache_key=RECENT_RAIN_CACHE_KEY,
                    payload=fallback_payload,
                    status="fallback",
                    ttl_seconds=RECENT_RAIN_FAILURE_TTL_SECONDS,
                )
                return fallback_payload

            fallback_payload = build_unavailable_recent_rain_payload()
            fallback_payload["cached_at"] = datetime.now(timezone.utc).isoformat()

            upsert_weather_cache(
                cache_key=RECENT_RAIN_CACHE_KEY,
                payload=fallback_payload,
                status="fallback",
                ttl_seconds=RECENT_RAIN_FAILURE_TTL_SECONDS,
            )
            return fallback_payload

        data = res.json()
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        precipitation_mm = hourly.get("precipitation", [])

        if not isinstance(times, list) or not isinstance(precipitation_mm, list):
            raise HTTPException(status_code=500, detail="Unexpected weather response format")

        hourly_rain_points: list[dict[str, Any]] = []

        for time_str, mm in zip(times, precipitation_mm):
            try:
                rain_inches = float(mm or 0) / 25.4
                hourly_rain_points.append(
                    {
                        "timestamp": str(time_str),
                        "rain_inches": rain_inches,
                    }
                )
            except Exception:
                continue

        payload = build_recent_rain_payload_from_hourly(
            hourly_rain_points,
            now=now,
            storm_window_hours=storm_window_hours,
            drying_window_hours=drying_window_hours,
        )
        payload = normalize_recent_rain_payload(
            {
                **payload,
                "storm_window_hours": storm_window_hours,
                "drying_window_hours": drying_window_hours,
                "cached_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        upsert_weather_cache(
            cache_key=RECENT_RAIN_CACHE_KEY,
            payload=payload,
            status="fresh",
            ttl_seconds=RECENT_RAIN_SUCCESS_TTL_SECONDS,
        )
        return payload

    except HTTPException:
        raise
    except Exception as e:
        print(f"/weather/recent-rain failed: {e}")

        if stale_payload:
            fallback_payload = normalize_recent_rain_payload(
                {
                    **stale_payload,
                    "cached_at": datetime.now(timezone.utc).isoformat(),
                    "unavailable": True,
                }
            )
            upsert_weather_cache(
                cache_key=RECENT_RAIN_CACHE_KEY,
                payload=fallback_payload,
                status="fallback",
                ttl_seconds=RECENT_RAIN_FAILURE_TTL_SECONDS,
            )
            return fallback_payload

        fallback_payload = build_unavailable_recent_rain_payload()
        fallback_payload["cached_at"] = datetime.now(timezone.utc).isoformat()

        upsert_weather_cache(
            cache_key=RECENT_RAIN_CACHE_KEY,
            payload=fallback_payload,
            status="fallback",
            ttl_seconds=RECENT_RAIN_FAILURE_TTL_SECONDS,
        )
        return fallback_payload