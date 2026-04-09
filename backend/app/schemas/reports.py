from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    trail_id: str
    primary_condition: str
    hazard_tags: list[str] = []
    note: str | None = Field(default=None, max_length=255)
