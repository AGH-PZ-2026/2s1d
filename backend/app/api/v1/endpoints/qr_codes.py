from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.item import Item
from app.schemas.qr_code import QRCodeDataResponse, QRItemResponse

router = APIRouter()

LEGACY_PREFIX = "ITEM-QR-"


@router.get("/{item_id}/generate-data", response_model=QRCodeDataResponse)
def get_qr_data_for_item(item_id: int, db: Session = Depends(get_db)):
    item = _get_item(db, item_id)
    return QRCodeDataResponse(item_id=item.id, qr_data=_qr_data(item))


@router.get("/scan/{qr_data}", response_model=QRItemResponse)
def scan_qr_code(qr_data: str, db: Session = Depends(get_db)):
    item = _find_by_qr_data(db, qr_data)
    return QRItemResponse(
        id=item.id,
        system_id=item.system_id,
        name=item.name,
        description=item.description,
        qr_data=_qr_data(item),
    )


def _get_item(db: Session, item_id: int) -> Item:
    item = db.query(Item).filter(Item.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Przedmiot nie istnieje.")
    return item


def _find_by_qr_data(db: Session, qr_data: str) -> Item:
    if qr_data.startswith(LEGACY_PREFIX):
        try:
            return _get_item(db, int(qr_data.removeprefix(LEGACY_PREFIX)))
        except ValueError:
            raise HTTPException(status_code=400, detail="Błędny ID w kodzie QR.")

    if not qr_data.startswith("ITEM-"):
        raise HTTPException(status_code=400, detail="Niepoprawny format kodu QR.")

    item = db.query(Item).filter(Item.system_id == qr_data).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Nieznany przedmiot z QR.")
    return item


def _qr_data(item: Item) -> str:
    return item.system_id or f"{LEGACY_PREFIX}{item.id}"
