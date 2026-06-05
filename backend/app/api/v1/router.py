from fastapi import APIRouter

from app.api.v1.endpoints import auth, categories, delegations, item, item_status

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(item_status.router)
api_router.include_router(categories.router)
api_router.include_router(item.router)
api_router.include_router(delegations.router)
api_router.include_router(auth.router)
