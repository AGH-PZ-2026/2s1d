from fastapi import APIRouter

from app.api.v1.endpoints import (
    audit_logs,
    auth,
    batch_qr,
    borrowings,
    categories,
    delegations,
    excel_import,
    item,
    item_photos,
    item_status,
    items,
    locations,
    notifications,
    qr_codes,
    quick_action,
    statuses,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(item_status.router)
api_router.include_router(categories.router)
api_router.include_router(items.router)
api_router.include_router(item.router)
api_router.include_router(item_photos.router)
api_router.include_router(locations.router)
api_router.include_router(borrowings.router)
api_router.include_router(notifications.router)
api_router.include_router(statuses.router)
api_router.include_router(qr_codes.router, prefix="/qr-codes", tags=["qr-codes"])
api_router.include_router(excel_import.router, prefix="/excel", tags=["excel-import"])
api_router.include_router(batch_qr.router, prefix="/batch-qr", tags=["batch-qr"])
api_router.include_router(
    quick_action.router, prefix="/quick-actions", tags=["quick-actions"]
)
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
api_router.include_router(delegations.router)
api_router.include_router(auth.router)
