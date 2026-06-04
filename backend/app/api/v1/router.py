from fastapi import APIRouter

from app.api.v1.endpoints import categories, item_status, quick_action

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(item_status.router)
api_router.include_router(categories.router)
api_router.include_router(
    quick_action.router, prefix="/quick-actions", tags=["quick-actions"]
)
