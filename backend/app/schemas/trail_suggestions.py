from pydantic import BaseModel, Field


class TrailSuggestionCreate(BaseModel):
    trail_name: str = Field(min_length=2, max_length=120)
    system_name: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=80)
    state: str | None = Field(default="TX", max_length=20)
    latitude: float | None = None
    longitude: float | None = None
    location_accuracy_meters: float | None = None
    notes: str | None = Field(default=None, max_length=500)