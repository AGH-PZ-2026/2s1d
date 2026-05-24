from fastapi import APIRouter

from app.api.v1.endpoints import item_status

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(item_status.router)
