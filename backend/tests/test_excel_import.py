import io

import openpyxl

from app.models.item import Item


def create_fake_excel(headers: list, rows: list) -> io.BytesIO:
    """Pomocnicza funkcja generująca plik Excel w pamięci RAM na potrzeby testów."""
    wb = openpyxl.Workbook()
    sheet = wb.active
    sheet.append(headers)
    for row in rows:
        sheet.append(row)

    out = io.BytesIO()
    wb.save(out)
    out.seek(0)
    return out


def test_upload_excel_success_and_errors(client, db):
    excel_file = create_fake_excel(
        headers=["name", "description"],
        rows=[
            ["Klawiatura", "Biała, mechaniczna"],
            [None, "Brak nazwy!"],
        ],
    )

    mime_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    response = client.post(
        "/api/v1/excel/upload",
        files={"file": ("test.xlsx", excel_file, mime_type)},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["total_rows_processed"] == 2
    assert data["successful_rows"] == 1
    assert len(data["errors"]) == 1
    assert data["errors"][0]["row_number"] == 3
    imported = db.query(Item).filter(Item.name == "Klawiatura").first()
    assert imported is not None
    assert imported.description == "Biała, mechaniczna"
    assert imported.system_id.startswith("ITEM-")


def test_upload_invalid_file_extension(client):
    response = client.post(
        "/api/v1/excel/upload",
        files={"file": ("test.txt", b"to nie jest excel", "text/plain")},
    )

    assert response.status_code == 400
    assert "xlsx" in response.json()["detail"]
