from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = BASE_DIR / ".env"


class Settings(BaseSettings):
    app_name: str = "Ride Recon API"
    app_env: str = "development"
    app_cors_origins: str = "http://localhost:3000"
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    weather_rain_threshold_inches: float = 0.20
    weather_window_hours: int = 72
    report_freshness_hours: int = 3

    admin_review_email: str = ""

    openweather_api_key: str | None = None
    weather_lat: float | None = None
    weather_lon: float | None = None

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        case_sensitive=False,
    )


settings = Settings()