from pydantic import BaseModel


class FeedbackCreate(BaseModel):
    type: str
    title: str | None = None
    message: str
    submitted_name: str | None = None
    submitted_location: str | None = None
