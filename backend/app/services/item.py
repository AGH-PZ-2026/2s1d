from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.delegation import PermissionLevel
from app.models.item import Item
from app.models.item_status import ItemStatus
from app.models.user import User
from app.schemas.item import ItemCreate
from app.services.delegation import get_user_permission

SYSTEM_ID_PREFIX = "ITEM"
SYSTEM_ID_RANDOM_LENGTH = 12


def get_by_id(db: Session, item_id: int) -> Item:
    item = db.query(Item).filter(Item.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Przedmiot nie istnieje")
    return item


def get_all(db: Session) -> list[Item]:
    return db.query(Item).all()


def create(db: Session, data: ItemCreate) -> Item:
    _validate_references(db, data)

    item = Item(
        system_id=_generate_system_id(db),
        name=data.name,
        manufacturer=data.manufacturer,
        description=data.description,
        purchase_date=data.purchase_date,
        added_at=datetime.now(UTC),
        category_id=data.category_id,
        status_id=data.status_id,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Nie udało się wygenerować unikalnego identyfikatora przedmiotu",
        ) from exc
    db.refresh(item)
    return item


def update_item_status(item_id: int, status_id: int, user: User, db: Session):
    item = _get_item_with_permission(
        item_id, user, db, [PermissionLevel.edit, PermissionLevel.manage]
    )
    _ensure_exists(db, ItemStatus, status_id, "Status nie istnieje")
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


def _get_item_with_permission(
    item_id: int,
    user: User,
    db: Session,
    required: list[PermissionLevel],
) -> Item:
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    permission = get_user_permission(item_id, user, db)
    if permission not in required:
        raise HTTPException(status_code=403, detail="No permission")
    return item


def _validate_references(db: Session, data: ItemCreate) -> None:
    _ensure_exists(db, Category, data.category_id, "Kategoria nie istnieje")
    _ensure_exists(db, ItemStatus, data.status_id, "Status nie istnieje")


def _ensure_exists(
    db: Session,
    model: type[Category] | type[ItemStatus],
    entity_id: int,
    detail: str,
) -> None:
    exists = db.query(model).filter(model.id == entity_id).first()
    if exists is None:
        raise HTTPException(status_code=404, detail=detail)


def _generate_system_id(db: Session) -> str:
    for _ in range(10):
        random_part = uuid4().hex[:SYSTEM_ID_RANDOM_LENGTH].upper()
        system_id = f"{SYSTEM_ID_PREFIX}-{random_part}"
        exists = db.query(Item).filter(Item.system_id == system_id).first()
        if exists is None:
            return system_id
    raise HTTPException(
        status_code=500,
        detail="Nie udało się wygenerować unikalnego identyfikatora przedmiotu",
    )
