from app.core.config import settings


def get_weather_warning(rainfall_inches_last_window: float) -> str | None:
    if rainfall_inches_last_window >= settings.weather_rain_threshold_inches:
        return "Likely Wet (Auto-detected)"
    return None
