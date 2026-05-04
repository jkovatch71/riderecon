from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import JSONResponse
import httpx
import traceback

from app.core.config import settings
from app.repositories.rider_assist_repository import RiderAssistRepository
from app.schemas.rider_assist import RiderAssistCreate, RiderAssistRespond

router = APIRouter(prefix="/rider-assist", tags=["rider-assist"])
repo = RiderAssistRepository()


async def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing auth token")

    token = authorization.replace("Bearer ", "")

    async with httpx.AsyncClient() as client:
        res = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.supabase_service_role_key,
            },
        )

    if res.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid token")

    return res.json()


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


@router.get("")
def list_active_assist_requests():
    try:
        return repo.list_active_requests()

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "trace": traceback.format_exc()},
        )


@router.post("")
async def create_assist_request(
    payload: RiderAssistCreate,
    user=Depends(get_current_user),
):
    try:
        user_id = user.get("id")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user")

        username = get_profile_username(user_id)

        result = repo.create_request(
            {
                **payload.model_dump(),
                "user_id": user_id,
                "username": username,
            }
        )

        return {
            "message": "Assist request posted.",
            "request": result,
        }

    except HTTPException:
        raise

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "trace": traceback.format_exc()},
        )
    
@router.post("/{request_id}/respond")
async def respond_to_assist_request(
    request_id: str,
    payload: RiderAssistRespond,
    user=Depends(get_current_user),
):
    try:
        user_id = user.get("id")

        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid user")

        username = get_profile_username(user_id)

        result = repo.respond_to_request(
            request_id,
            {
                **payload.model_dump(),
                "user_id": user_id,
                "username": username,
            },
        )

        return {
            "message": "Response posted.",
            "request": result,
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    except HTTPException:
        raise

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e), "trace": traceback.format_exc()},
        )
    
    @router.post("/{request_id}/resolve")
    async def resolve_assist_request(
        request_id: str,
        user=Depends(get_current_user),
    ):
        try:
            user_id = user.get("id")

            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid user")

            result = repo.resolve_request(
                request_id,
                {
                    "user_id": user_id,
                },
            )

            return {
                "message": "Assist request resolved.",
                "request": result,
            }

        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))

        except HTTPException:
            raise

        except Exception as e:
            return JSONResponse(
                status_code=500,
                content={"error": str(e), "trace": traceback.format_exc()},
            )