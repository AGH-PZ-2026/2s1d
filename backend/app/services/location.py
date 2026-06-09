from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.location import Location
from app.schemas.location import LocationCreate, LocationUpdate


def get_all(db: Session, include_inactive: bool = False) -> list[Location]:
    query = db.query(Location)
    if not include_inactive:
        query = query.filter(Location.is_active == True)  # noqa: E712
    return query.order_by(Location.name.asc()).all()


def get_by_id(db: Session, location_id: int) -> Location:
    location = db.query(Location).filter(Location.id == location_id).first()
    if location is None:
        raise HTTPException(status_code=404, detail="Lokalizacja nie istnieje")
    return location


def create(db: Session, data: LocationCreate) -> Location:
    location = Location(**data.model_dump())
    db.add(location)
    _commit_location(db, location)
    return location


def update(db: Session, location_id: int, data: LocationUpdate) -> Location:
    location = get_by_id(db, location_id)
    updates = data.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(location, field, value)
    _commit_location(db, location)
    return location


def delete(db: Session, location_id: int) -> None:
    location = get_by_id(db, location_id)
    if location.items:
        location.is_active = False
        db.commit()
        return
    db.delete(location)
    db.commit()


def _commit_location(db: Session, location: Location) -> None:
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Lokalizacja o tej nazwie już istnieje",
        ) from exc
    db.refresh(location)
