from pydantic import BaseModel, Field


class RiderAssistCreate(BaseModel):
    assist_type: str
    note: str | None = Field(default=None, max_length=255)
    latitude: float | None = None
    longitude: float | None = None
    location_accuracy_meters: float | None = None