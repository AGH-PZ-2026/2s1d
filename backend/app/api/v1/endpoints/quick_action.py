from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.delegation import Delegation, PermissionLevel
from app.models.item import Item
from app.models.item_status import ItemStatus
from app.schemas.quick_action import ItemDetailsResponse, QuickActionRequest

router = APIRouter()


@router.get("/{item_id}", response_model=ItemDetailsResponse)
def get_item_details(item_id: int, db: Session = Depends(get_db)):
    item = _get_item(db, item_id)
    return _to_details(item)


@router.patch("/{item_id}/mark-damaged", response_model=ItemDetailsResponse)
def mark_item_damaged(
    item_id: int,
    request: QuickActionRequest,
    db: Session = Depends(get_db),
):
    item = _get_item(db, item_id)
    if not _can_mark_damaged(db, item, request.user_id):
        raise HTTPException(
            status_code=403,
            detail="Brak uprawnień do edycji tego przedmiotu.",
        )

    damaged_status = (
        db.query(ItemStatus).filter(ItemStatus.name.ilike("uszkodzony")).first()
    )
    if damaged_status is None:
        raise HTTPException(status_code=409, detail="Brak statusu Uszkodzony")

    item.status_id = damaged_status.id
    db.commit()
    db.refresh(item)
    return _to_details(item)


def _get_item(db: Session, item_id: int) -> Item:
    item = db.query(Item).filter(Item.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Nie znaleziono przedmiotu.")
    return item


def _can_mark_damaged(db: Session, item: Item, user_id: int) -> bool:
    if item.owner_id == user_id:
        return True
    delegation = (
        db.query(Delegation)
        .filter(
            Delegation.item_id == item.id,
            Delegation.user_id == user_id,
            Delegation.permission.in_([PermissionLevel.edit, PermissionLevel.manage]),
        )
        .first()
    )
    return delegation is not None


def _to_details(item: Item) -> ItemDetailsResponse:
    location = item.location
    if item.target_location is not None:
        location = item.target_location.name
    return ItemDetailsResponse(
        id=item.id,
        name=item.name,
        location=location or "",
        owner_id=item.owner_id,
        status=item.status.name if item.status else "",
    )
