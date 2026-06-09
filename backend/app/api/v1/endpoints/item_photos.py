from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.item_photo import ItemPhotoResponse
from app.services import item_photo as service

router = APIRouter(prefix="/items/{item_id}/photos", tags=["item-photos"])


@router.get("/", response_model=list[ItemPhotoResponse])
def list_item_photos(item_id: int, db: Session = Depends(get_db)):
    return service.list_photos(db, item_id)


@router.post("/", response_model=ItemPhotoResponse, status_code=201)
def add_item_photo(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.add_photo(db, item_id, file, current_user)
