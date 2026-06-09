import io

import openpyxl
from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.excel_import import ImportErrorDetail, ImportReport

router = APIRouter()


@router.post("/upload", response_model=ImportReport)
async def upload_excel_file(file: UploadFile = File(...)):
    """Przyjmuje plik .xlsx, weryfikuje wiersze i zwraca raport z importu."""
    if not file.filename.endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Tylko pliki .xlsx.")

    contents = await file.read()

    try:
        wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        sheet = wb.active
    except Exception:
        raise HTTPException(status_code=400, detail="Błąd odczytu pliku Excel.")

    errors = []
    successful_rows = 0
    total_rows = 0

    headers = [str(c.value).strip().lower() for c in sheet[1] if c.value]

    if "name" not in headers:
        raise HTTPException(status_code=400, detail="Brak kolumny 'name'.")

    name_idx = headers.index("name")

    rows_iterator = sheet.iter_rows(min_row=2, values_only=True)
    for row_idx, row in enumerate(rows_iterator, start=2):
        if not any(row):
            continue

        total_rows += 1
        name_value = row[name_idx]

        if not name_value:
            errors.append(
                ImportErrorDetail(
                    row_number=row_idx, error_message="Brak wymaganej nazwy przedmiotu."
                )
            )
        else:
            # TODO: Tu dodam zapis do bazy, gdy ticket #18 zostanie zmergowany
            successful_rows += 1

    return ImportReport(
        total_rows_processed=total_rows, successful_rows=successful_rows, errors=errors
    )
