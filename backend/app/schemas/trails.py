from datetime import datetime
from pydantic import BaseModel


class TrailOut(BaseModel):
    id: str
    name: str
    alias: str | None = None
    system_name: str
    status_color: str
    current_condition: str
    last_reported_at: datetime
    weather_warning: str | None = None
    latitude: float
    longitude: float
    report_count: int


class ReportOut(BaseModel):
    id: str
    username: str
    trail_id: str
    primary_condition: str
    hazard_tags: list[str]
    note: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    is_edited: bool = False
