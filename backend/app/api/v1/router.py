from fastapi import APIRouter, Depends

from app.api.v1.endpoints import (
    audit_logs,
    auth,
    batch_qr,
    borrowings,
    categories,
    delegations,
    excel_import,
    groups,
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
from app.core.dependencies import get_current_user

api_router = APIRouter(prefix="/api/v1")
authenticated = [Depends(get_current_user)]

api_router.include_router(item_status.router, dependencies=authenticated)
api_router.include_router(categories.router, dependencies=authenticated)
api_router.include_router(items.router, dependencies=authenticated)
api_router.include_router(item.router, dependencies=authenticated)
api_router.include_router(item_photos.router, dependencies=authenticated)
api_router.include_router(locations.router, dependencies=authenticated)
api_router.include_router(borrowings.router, dependencies=authenticated)
api_router.include_router(notifications.router, dependencies=authenticated)
api_router.include_router(statuses.router, dependencies=authenticated)
api_router.include_router(
    qr_codes.router,
    prefix="/qr-codes",
    tags=["qr-codes"],
    dependencies=authenticated,
)
api_router.include_router(
    excel_import.router,
    prefix="/excel",
    tags=["excel-import"],
    dependencies=authenticated,
)
api_router.include_router(
    batch_qr.router,
    prefix="/batch-qr",
    tags=["batch-qr"],
    dependencies=authenticated,
)
api_router.include_router(
    quick_action.router,
    prefix="/quick-actions",
    tags=["quick-actions"],
    dependencies=authenticated,
)
api_router.include_router(
    audit_logs.router,
    prefix="/audit-logs",
    tags=["audit-logs"],
    dependencies=authenticated,
)
api_router.include_router(delegations.router, dependencies=authenticated)
api_router.include_router(groups.router, dependencies=authenticated)
api_router.include_router(auth.router)
