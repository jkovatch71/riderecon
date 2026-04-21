from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.favorites import router as favorites_router
from app.routers.weather import router as weather_router
from app.routers.auth import router as auth_router

from app.core.config import settings
from app.routers import feedback, reports, trails, weather

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.app_cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Trail Conditions API is running."}


app.include_router(trails.router)
app.include_router(reports.router)
app.include_router(feedback.router)
app.include_router(favorites_router)
app.include_router(weather_router)
app.include_router(auth_router)
