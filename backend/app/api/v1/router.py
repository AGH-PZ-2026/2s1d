from fastapi import APIRouter

from app.api.v1.endpoints import batch_qr, categories, item_status

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(item_status.router)
api_router.include_router(categories.router)
api_router.include_router(batch_qr.router, prefix="/batch-qr", tags=["batch-qr"])
