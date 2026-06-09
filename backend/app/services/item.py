from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.delegation import PermissionLevel
from app.models.group import Group
from app.models.item import Item
from app.models.item_status import ItemStatus
from app.models.location import Location
from app.models.user import User
from app.schemas.audit_log import AuditLogAction
from app.schemas.item import ItemCreate
from app.services.audit_log import record_audit_log
from app.services.delegation import get_user_permission

SYSTEM_ID_PREFIX = "ITEM"
SYSTEM_ID_RANDOM_LENGTH = 12


def get_by_id(db: Session, item_id: int) -> Item:
    item = db.query(Item).filter(Item.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Przedmiot nie istnieje")
    return item


ITEM_SORT_FIELDS = {
    "id": Item.id,
    "name": Item.name,
    "manufacturer": Item.manufacturer,
    "added_at": Item.added_at,
    "purchase_date": Item.purchase_date,
}


def get_all(
    db: Session,
    *,
    category_id: int | None = None,
    status_id: int | None = None,
    owner_id: int | None = None,
    manufacturer: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
    sort_by: str = "id",
    sort_dir: str = "asc",
) -> list[Item]:
    query = db.query(Item)
    if category_id is not None:
        query = query.filter(Item.category_id == category_id)
    if status_id is not None:
        query = query.filter(Item.status_id == status_id)
    if owner_id is not None:
        query = query.filter(Item.owner_id == owner_id)
    if manufacturer:
        query = query.filter(Item.manufacturer.ilike(f"%{manufacturer.strip()}%"))
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(Item.name.ilike(term) | Item.description.ilike(term))

    sort_column = ITEM_SORT_FIELDS.get(sort_by)
    if sort_column is None:
        raise HTTPException(
            status_code=422,
            detail="Nieobsługiwane pole sortowania",
        )
    if sort_dir not in {"asc", "desc"}:
        raise HTTPException(
            status_code=422, detail="Nieobsługiwany kierunek sortowania"
        )

    sort_expression = sort_column.desc() if sort_dir == "desc" else sort_column.asc()
    return query.order_by(sort_expression).offset(offset).limit(limit).all()


def create(db: Session, data: ItemCreate, user: User) -> Item:
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
        location_id=data.location_id,
        owner_id=data.owner_id,
        owner_group_id=data.owner_group_id,
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
    record_audit_log(
        db,
        user_id=user.id,
        action=AuditLogAction.ITEM_CREATED,
        item_id=item.id,
        new_value={
            "name": item.name,
            "status_id": item.status_id,
            "category_id": item.category_id,
            "location_id": item.location_id,
            "owner_id": item.owner_id,
        },
    )
    return item


def update_item_status(item_id: int, status_id: int, user: User, db: Session):
    item = _get_item_with_permission(
        item_id, user, db, [PermissionLevel.edit, PermissionLevel.manage]
    )
    old_status_id = item.status_id
    _ensure_exists(db, ItemStatus, status_id, "Status nie istnieje")
    item.status_id = status_id
    db.commit()
    record_audit_log(
        db,
        user_id=user.id,
        action=AuditLogAction.STATUS_CHANGED,
        item_id=item.id,
        old_value={"status_id": old_status_id},
        new_value={"status_id": status_id},
    )
    return {"message": "Status updated"}


def update_item_description(item_id: int, description: str, user: User, db: Session):
    item = _get_item_with_permission(
        item_id, user, db, [PermissionLevel.edit, PermissionLevel.manage]
    )
    old_description = item.description
    item.description = description
    db.commit()
    record_audit_log(
        db,
        user_id=user.id,
        action=AuditLogAction.ITEM_UPDATED,
        item_id=item.id,
        old_value={"description": old_description},
        new_value={"description": description},
    )
    return {"message": "Description updated"}


def update_item_location(item_id: int, location: str, user: User, db: Session):
    item = _get_item_with_permission(item_id, user, db, [PermissionLevel.manage])
    old_location = item.location
    item.location = location
    db.commit()
    record_audit_log(
        db,
        user_id=user.id,
        action=AuditLogAction.LOCATION_CHANGED,
        item_id=item.id,
        old_value={"location": old_location},
        new_value={"location": location},
    )
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
    if data.location_id is not None:
        _ensure_exists(db, Location, data.location_id, "Lokalizacja nie istnieje")
    if data.owner_id is not None:
        _ensure_exists(db, User, data.owner_id, "Właściciel nie istnieje")
    if data.owner_group_id is not None:
        _ensure_exists(
            db,
            Group,
            data.owner_group_id,
            "Grupa właścicielska nie istnieje",
        )


def _ensure_exists(
    db: Session,
    model: (
        type[Category] | type[ItemStatus] | type[Location] | type[User] | type[Group]
    ),
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
