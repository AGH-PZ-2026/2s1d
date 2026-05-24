from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.item_status import ItemStatus
from app.schemas.item_status import (
    ItemStatusCreate,
    ItemStatusResponse,
    ItemStatusUpdate,
)

router = APIRouter(prefix="/item-status", tags=["item-status"])


@router.get("/", response_model=list[ItemStatusResponse])
def get_statuses(db: Session = Depends(get_db)):
    return db.query(ItemStatus).all()


@router.post("/", response_model=ItemStatusResponse, status_code=201)
def create_status(data: ItemStatusCreate, db: Session = Depends(get_db)):
    status = ItemStatus(name=data.name, is_system=False)
    db.add(status)
    db.commit()
    db.refresh(status)
    return status


@router.put("/{status_id}", response_model=ItemStatusResponse)
def update_status(
    status_id: int, data: ItemStatusUpdate, db: Session = Depends(get_db)
):
    status = db.query(ItemStatus).filter(ItemStatus.id == status_id).first()
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    if status.is_system:
        raise HTTPException(status_code=403, detail="Cannot modify system status")
    status.name = data.name
    db.commit()
    db.refresh(status)
    return status


@router.delete("/{status_id}", status_code=204)
def delete_status(status_id: int, db: Session = Depends(get_db)):
    status = db.query(ItemStatus).filter(ItemStatus.id == status_id).first()
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")
    if status.is_system:
        raise HTTPException(status_code=403, detail="Cannot delete system status")
    db.delete(status)
    db.commit()
