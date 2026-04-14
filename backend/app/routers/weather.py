from fastapi import APIRouter, HTTPException
import httpx
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.config import settings

router = APIRouter(prefix="/weather", tags=["weather"])


CACHE_TTL_SECONDS = 300  # 5 minutes

_weather_cache: dict[str, dict[str, Any]] = {
    "current": {"data": None, "expires_at": None},
    "recent_rain": {"data": None, "expires_at": None},
}


def get_cached_value(key: str):
    entry = _weather_cache.get(key)
    if not entry:
        return None

    expires_at = entry.get("expires_at")
    data = entry.get("data")

    if not expires_at or data is None:
        return None

    if datetime.now(timezone.utc) >= expires_at:
        return None

    return data


def set_cached_value(key: str, data: dict[str, Any]):
    _weather_cache[key] = {
        "data": data,
        "expires_at": datetime.now(timezone.utc) + timedelta(seconds=CACHE_TTL_SECONDS),
    }


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
    cached = get_cached_value("current")
    if cached is not None:
        return cached

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

    payload = {
        "temperature": temp,
        "summary": phrase_for_description(raw_description) if raw_description else None,
        "raw_summary": raw_description,
        "cached_at": datetime.now(timezone.utc).isoformat(),
    }

    set_cached_value("current", payload)
    return payload


@router.get("/recent-rain")
async def get_recent_rain():
    cached = get_cached_value("recent_rain")
    if cached is not None:
        return cached

    if settings.weather_lat is None or settings.weather_lon is None:
        raise HTTPException(status_code=500, detail="WEATHER_LAT/WEATHER_LON are missing")

    if settings.weather_window_hours is None:
        raise HTTPException(status_code=500, detail="WEATHER_WINDOW_HOURS is missing")

    if settings.weather_rain_threshold_inches is None:
        raise HTTPException(status_code=500, detail="WEATHER_RAIN_THRESHOLD_INCHES is missing")

    hours = settings.weather_window_hours
    now = datetime.now(timezone.utc)

    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": settings.weather_lat,
        "longitude": settings.weather_lon,
        "hourly": "precipitation",
        "past_hours": hours,
        "forecast_hours": 1,
        "timezone": "UTC",
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(url, params=params)

        if res.status_code != 200:
            raise HTTPException(status_code=res.status_code, detail=res.text)

        data = res.json()
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        precipitation_mm = hourly.get("precipitation", [])

        if not isinstance(times, list) or not isinstance(precipitation_mm, list):
            raise HTTPException(status_code=500, detail="Unexpected weather response format")

        total_mm = 0.0
        cutoff = now - timedelta(hours=hours)

        for time_str, mm in zip(times, precipitation_mm):
            try:
                ts = datetime.fromisoformat(str(time_str).replace("Z", "+00:00"))
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)

                if ts >= cutoff:
                    total_mm += float(mm or 0)
            except Exception:
                continue

        total_inches = total_mm / 25.4
        exceeds_threshold = total_inches >= settings.weather_rain_threshold_inches

        payload = {
            "window_hours": hours,
            "rain_inches": round(total_inches, 3),
            "threshold_inches": settings.weather_rain_threshold_inches,
            "exceeds_threshold": exceeds_threshold,
            "cached_at": datetime.now(timezone.utc).isoformat(),
        }

        set_cached_value("recent_rain", payload)
        return payload

    except HTTPException:
        raise
    except Exception as e:
        print(f"/weather/recent-rain failed: {e}")
        raise HTTPException(status_code=500, detail=f"recent-rain failed: {str(e)}")