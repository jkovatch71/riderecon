from fastapi import APIRouter

from app.schemas.feedback import FeedbackCreate

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post("")
def submit_feedback(payload: FeedbackCreate):
    return {"message": f"Received {payload.type}. Thanks for helping improve the app."}
