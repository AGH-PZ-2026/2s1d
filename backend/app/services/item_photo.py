from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.models.item import Item
from app.models.item_photo import ItemPhoto
from app.models.user import User

UPLOAD_ROOT = Path("uploads/item_photos")
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def list_photos(db: Session, item_id: int) -> list[ItemPhoto]:
    _ensure_item_exists(db, item_id)
    return (
        db.query(ItemPhoto)
        .filter(ItemPhoto.item_id == item_id)
        .order_by(ItemPhoto.added_at.desc())
        .all()
    )


def add_photo(db: Session, item_id: int, file: UploadFile, user: User) -> ItemPhoto:
    _ensure_item_exists(db, item_id)
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail="Nieobsługiwany format zdjęcia")

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "photo").suffix.lower()
    filename = f"{item_id}-{uuid4().hex}{suffix}"
    storage_path = UPLOAD_ROOT / filename

    with storage_path.open("wb") as output:
        output.write(file.file.read())

    photo = ItemPhoto(
        item_id=item_id,
        uploaded_by_id=user.id,
        original_filename=file.filename or filename,
        content_type=file.content_type,
        storage_path=str(storage_path),
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


def _ensure_item_exists(db: Session, item_id: int) -> None:
    exists = db.query(Item).filter(Item.id == item_id).first()
    if exists is None:
        raise HTTPException(status_code=404, detail="Przedmiot nie istnieje")
