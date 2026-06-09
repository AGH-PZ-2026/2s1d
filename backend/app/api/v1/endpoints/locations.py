from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.location import LocationCreate, LocationResponse, LocationUpdate
from app.services import location as service

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/", response_model=list[LocationResponse])
def list_locations(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
):
    return service.get_all(db, include_inactive=include_inactive)


@router.post("/", response_model=LocationResponse, status_code=201)
def create_location(data: LocationCreate, db: Session = Depends(get_db)):
    return service.create(db, data)


@router.get("/{location_id}", response_model=LocationResponse)
def get_location(location_id: int, db: Session = Depends(get_db)):
    return service.get_by_id(db, location_id)


@router.patch("/{location_id}", response_model=LocationResponse)
def update_location(
    location_id: int,
    data: LocationUpdate,
    db: Session = Depends(get_db),
):
    return service.update(db, location_id, data)


@router.delete("/{location_id}", status_code=204)
def delete_location(location_id: int, db: Session = Depends(get_db)):
    service.delete(db, location_id)
