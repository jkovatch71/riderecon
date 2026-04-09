from fastapi import APIRouter

from app.repositories.trails_repository import TrailsRepository

router = APIRouter(prefix="/trails", tags=["trails"])
repo = TrailsRepository()


@router.get("")
def list_trails():
    return repo.list_trails()


@router.get("/{trail_id}")
def get_trail(trail_id: str):
    return repo.get_trail(trail_id)
    if not trail:
        raise HTTPException(status_code=404, detail="Trail not found")
    return trail


@router.get("/{trail_id}/reports")
def get_trail_reports(trail_id: str):
    return repo.get_reports(trail_id)
