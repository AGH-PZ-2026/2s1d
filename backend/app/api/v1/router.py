from fastapi import APIRouter

from app.api.v1.endpoints import (
    audit_logs,
    batch_qr,
    categories,
    excel_import,
    item_status,
    items,
    qr_codes,
    quick_action,
    statuses,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(item_status.router)
api_router.include_router(categories.router)
api_router.include_router(items.router)
api_router.include_router(statuses.router)
api_router.include_router(qr_codes.router, prefix="/qr-codes", tags=["qr-codes"])
api_router.include_router(excel_import.router, prefix="/excel", tags=["excel-import"])
api_router.include_router(batch_qr.router, prefix="/batch-qr", tags=["batch-qr"])
api_router.include_router(
    quick_action.router, prefix="/quick-actions", tags=["quick-actions"]
)
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
