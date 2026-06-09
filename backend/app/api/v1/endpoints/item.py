from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.services import item as service

router = APIRouter(prefix="/items", tags=["items"])


@router.patch("/{item_id}/status")
def update_status(
    item_id: int,
    status_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.update_item_status(item_id, status_id, current_user, db)


@router.patch("/{item_id}/description")
def update_description(
    item_id: int,
    description: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.update_item_description(item_id, description, current_user, db)


@router.patch("/{item_id}/location")
def update_location(
    item_id: int,
    location_id: int = Query(alias="locationId"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.update_item_location(item_id, location_id, current_user, db)
