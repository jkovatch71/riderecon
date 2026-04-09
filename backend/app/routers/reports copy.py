from fastapi import APIRouter, Header, HTTPException, Depends
import httpx
import os

from app.repositories.reports_repository import ReportsRepository
from app.schemas.reports import ReportCreate

router = APIRouter(prefix="/reports", tags=["reports"])
repo = ReportsRepository()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing auth token")

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase auth environment variables are missing")

    token = authorization.replace("Bearer ", "")

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
            },
        )

    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid token")

    return res.json()


@router.post("")
async def create_report(
    payload: ReportCreate,
    user=Depends(get_current_user)
):
    user_id = user.get("id")

    repo.create_report({
        **payload.model_dump(),
        "user_id": user_id
    })

    return {
        "message": "Report submitted. Any image would remain under review until approved."
    }