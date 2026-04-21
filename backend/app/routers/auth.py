from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client

from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

supabase_admin: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)


class ResolveLoginRequest(BaseModel):
    identifier: str


class ResolveLoginResponse(BaseModel):
    email: str


@router.post("/resolve-login", response_model=ResolveLoginResponse)
def resolve_login(payload: ResolveLoginRequest):
    identifier = payload.identifier.strip().lower()

    if not identifier:
        raise HTTPException(status_code=400, detail="Identifier is required.")

    # Email path
    if "@" in identifier:
        return ResolveLoginResponse(email=identifier)

    # Username path
    profile_result = (
        supabase_admin.table("profiles")
        .select("id")
        .eq("username", identifier)
        .maybe_single()
        .execute()
    )

    profile = profile_result.data
    if not profile or not profile.get("id"):
        raise HTTPException(status_code=400, detail="Invalid login credentials.")

    auth_user = supabase_admin.auth.admin.get_user_by_id(profile["id"])
    user = getattr(auth_user, "user", None)

    if not user or not getattr(user, "email", None):
        raise HTTPException(status_code=400, detail="Invalid login credentials.")

    return ResolveLoginResponse(email=user.email.lower())