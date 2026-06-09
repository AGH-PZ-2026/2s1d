import io
from datetime import UTC, datetime
from uuid import uuid4

import openpyxl
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.category import Category
from app.models.item import Item
from app.models.item_status import ItemStatus
from app.schemas.excel_import import ImportErrorDetail, ImportReport

router = APIRouter()

SYSTEM_ID_PREFIX = "ITEM"
SYSTEM_ID_RANDOM_LENGTH = 12


@router.post("/upload", response_model=ImportReport)
async def upload_excel_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Tylko pliki .xlsx.")

    contents = await file.read()
    try:
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        sheet = wb.active
    except Exception:
        raise HTTPException(status_code=400, detail="Błąd odczytu pliku Excel.")

    headers = [str(c.value).strip().lower() for c in sheet[1] if c.value]
    if "name" not in headers:
        raise HTTPException(status_code=400, detail="Brak kolumny 'name'.")

    default_category = _get_or_create_default_category(db)
    default_status = _get_or_create_default_status(db)
    errors: list[ImportErrorDetail] = []
    successful_rows = 0
    total_rows = 0

    for row_idx, row in enumerate(
        sheet.iter_rows(min_row=2, values_only=True), start=2
    ):
        if not any(row):
            continue
        total_rows += 1
        values = _row_values(headers, row)
        name = _text(values.get("name"))
        if not name:
            errors.append(
                ImportErrorDetail(
                    row_number=row_idx,
                    error_message="Brak wymaganej nazwy przedmiotu.",
                )
            )
            continue

        try:
            item = Item(
                system_id=_generate_system_id(db),
                name=name,
                manufacturer=_text(values.get("manufacturer")) or "Nieznany",
                description=_text(values.get("description")),
                purchase_date=values.get("purchase_date"),
                added_at=datetime.now(UTC),
                category_id=_int(values.get("category_id")) or default_category.id,
                status_id=_int(values.get("status_id")) or default_status.id,
                location_id=_int(values.get("location_id")),
                owner_id=_int(values.get("owner_id")),
            )
            db.add(item)
            db.commit()
        except Exception as exc:
            db.rollback()
            errors.append(
                ImportErrorDetail(
                    row_number=row_idx,
                    error_message=str(exc),
                )
            )
        else:
            successful_rows += 1

    return ImportReport(
        total_rows_processed=total_rows,
        successful_rows=successful_rows,
        errors=errors,
    )


def _row_values(headers: list[str], row: tuple) -> dict[str, object]:
    return {
        header: row[index] if index < len(row) else None
        for index, header in enumerate(headers)
    }


def _text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _int(value: object) -> int | None:
    if value in (None, ""):
        return None
    return int(value)


def _get_or_create_default_category(db: Session) -> Category:
    category = db.query(Category).filter(Category.name == "Import Excel").first()
    if category is None:
        category = Category(name="Import Excel")
        db.add(category)
        db.commit()
        db.refresh(category)
    return category


def _get_or_create_default_status(db: Session) -> ItemStatus:
    status = db.query(ItemStatus).filter(ItemStatus.name == "Dostępny").first()
    if status is None:
        status = ItemStatus(name="Dostępny", is_system=True)
        db.add(status)
        db.commit()
        db.refresh(status)
    return status


def _generate_system_id(db: Session) -> str:
    for _ in range(10):
        system_id = (
            f"{SYSTEM_ID_PREFIX}-{uuid4().hex[:SYSTEM_ID_RANDOM_LENGTH].upper()}"
        )
        if db.query(Item).filter(Item.system_id == system_id).first() is None:
            return system_id
    raise HTTPException(
        status_code=500,
        detail="Nie udało się wygenerować identyfikatora przedmiotu.",
    )
