from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.delegation import PermissionLevel
from app.models.item import Item
from app.models.user import User
from app.services.delegation import get_user_permission


def _get_item_with_permission(item_id: int, user: User, db: Session, required: list):
    permission = get_user_permission(item_id, user, db)
    if permission not in required:
        raise HTTPException(status_code=403, detail="No permission")
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


def update_item_status(item_id: int, status_id: int, user: User, db: Session):
    item = _get_item_with_permission(
        item_id, user, db, [PermissionLevel.edit, PermissionLevel.manage]
    )
    item.status_id = status_id
    db.commit()
    return {"message": "Status updated"}


def update_item_description(item_id: int, description: str, user: User, db: Session):
    item = _get_item_with_permission(
        item_id, user, db, [PermissionLevel.edit, PermissionLevel.manage]
    )
    item.description = description
    db.commit()
    return {"message": "Description updated"}


def update_item_location(item_id: int, location: str, user: User, db: Session):
    item = _get_item_with_permission(item_id, user, db, [PermissionLevel.manage])
    item.location = location
    db.commit()
    return {"message": "Location updated"}
