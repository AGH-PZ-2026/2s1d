from app.models.item import Item


def test_generate_qr_data_success(client, db):
    item = _create_item(db, system_id="ITEM-ABC123")

    response = client.get(f"/api/v1/qr-codes/{item.id}/generate-data")

    assert response.status_code == 200
    assert response.json()["qr_data"] == "ITEM-ABC123"


def test_generate_qr_data_not_found(client):
    response = client.get("/api/v1/qr-codes/999/generate-data")
    assert response.status_code == 404


def test_scan_qr_code_success_by_system_id(client, db):
    item = _create_item(db, system_id="ITEM-SCAN123")

    response = client.get("/api/v1/qr-codes/scan/ITEM-SCAN123")

    assert response.status_code == 200
    assert response.json()["id"] == item.id
    assert response.json()["name"] == "Laptop Dell"


def test_scan_legacy_qr_code_success(client, db):
    item = _create_item(db, system_id=None)

    response = client.get(f"/api/v1/qr-codes/scan/ITEM-QR-{item.id}")

    assert response.status_code == 200
    assert response.json()["id"] == item.id


def test_scan_qr_code_invalid_format(client):
    response = client.get("/api/v1/qr-codes/scan/ZLY-KOD-123")
    assert response.status_code == 400


def test_scan_qr_code_not_found(client):
    response = client.get("/api/v1/qr-codes/scan/ITEM-QR-999")
    assert response.status_code == 404


def _create_item(db, system_id: str | None) -> Item:
    item = Item(
        system_id=system_id,
        name="Laptop Dell",
        description="Służbowy laptop",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
