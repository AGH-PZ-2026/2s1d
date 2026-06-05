from fastapi import APIRouter

from app.api.v1.endpoints import audit_logs, categories, excel_import, item_status

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(item_status.router)
api_router.include_router(categories.router)
api_router.include_router(excel_import.router, prefix="/excel", tags=["excel-import"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
