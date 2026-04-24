from fastapi import APIRouter, Header, HTTPException, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from pathlib import Path
import httpx
import os
import traceback

from app.repositories.reports_repository import ReportsRepository
from app.schemas.reports import ReportCreate

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

router = APIRouter(prefix="/reports", tags=["reports"])
repo = ReportsRepository()


def get_profile_username(user_id: str) -> str:
    profile_res = (
        repo.client.table("profiles")
        .select("username")
        .eq("id", user_id)
        .limit(1)
        .execute()
    ) if repo.client else None

    if profile_res and profile_res.data:
        return profile_res.data[0].get("username") or "rider"

    return "rider"


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")


async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing auth token")

    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Supabase auth environment variables are missing",
        )

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
async def create_report(payload: ReportCreate, user=Depends(get_current_user)):
    try:
        user_id = user.get("id")
        username = get_profile_username(user_id)

        result = repo.create_report({
            **payload.model_dump(),
            "user_id": user_id,
            "username": username,
        })

        return {
            "message": "Report submitted.",
            "report": result,
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "trace": traceback.format_exc(),
            },
        )


@router.post("/{report_id}/confirm")
async def confirm_report(report_id: str, user=Depends(get_current_user)):
    try:
        user_id = user.get("id")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user")

        result = repo.confirm_report(report_id, user_id)

        return {
            "message": "Report confirmed.",
            **result,
        }

    except HTTPException:
        raise

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "error": str(e),
                "trace": traceback.format_exc(),
            },
        )