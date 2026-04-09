from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Trail Conditions API"
    app_env: str = "development"
    app_cors_origins: str = "http://localhost:3000"
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    weather_rain_threshold_inches: float = 0.20
    weather_window_hours: int = 6
    report_freshness_hours: int = 3
    admin_review_email: str = ""

    openweather_api_key: str | None = None
    weather_lat: float | None = None
    weather_lon: float | None = None

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)


settings = Settings()
