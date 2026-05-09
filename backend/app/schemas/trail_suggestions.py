from pydantic import BaseModel, Field, field_validator


class TrailSuggestionCreate(BaseModel):
    trail_name: str = Field(min_length=2, max_length=120)
    system_name: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=80)
    state: str | None = Field(default=None, max_length=2)
    latitude: float | None = None
    longitude: float | None = None
    location_accuracy_meters: float | None = None
    notes: str | None = Field(default=None, max_length=500)

    @field_validator("state")
    @classmethod
    def normalize_state(cls, v):
        if not v:
            return None

        v = v.strip().upper()

        if len(v) != 2 or not v.isalpha():
            raise ValueError("State must be a 2-letter abbreviation (e.g., TX)")

        return v