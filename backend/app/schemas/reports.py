from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    trail_id: str
    primary_condition: str
    hazard_tags: list[str] = []
    note: str | None = Field(default=None, max_length=255)
    hazard_latitude: float | None = None
    hazard_longitude: float | None = None
    hazard_location_accuracy_meters: float | None = None