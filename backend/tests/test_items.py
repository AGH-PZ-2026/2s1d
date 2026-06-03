from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError

from app.models.category import Category
from app.models.item import Item
from app.models.item_status import ItemStatus


def test_create_item_with_all_references(client, db):
    refs = _create_references(db)

    response = client.post(
        "/api/v1/items/",
        json=_item_payload(
            refs,
            description="Stanowisko laboratoryjne",
            purchaseDate="2026-05-10",
        ),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Oscyloskop"
    assert data["manufacturer"] == "Rigol"
    assert data["description"] == "Stanowisko laboratoryjne"
    assert data["purchaseDate"] == "2026-05-10"
    assert data["addedAt"] is not None
    assert data["systemId"].startswith("ITEM-")
    assert len(data["systemId"]) == 17
    assert data["categoryId"] == refs["categoryId"]
    assert data["statusId"] == refs["statusId"]


def test_list_items_returns_frontend_shape(client, db):
    refs = _create_references(db)
    created = client.post("/api/v1/items/", json=_item_payload(refs)).json()

    response = client.get("/api/v1/items/")

    assert response.status_code == 200
    assert response.json() == [created]


def test_create_item_generates_unique_system_id(client, db):
    refs = _create_references(db)
    first = client.post("/api/v1/items/", json=_item_payload(refs, name="A"))
    second = client.post("/api/v1/items/", json=_item_payload(refs, name="B"))

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["systemId"] != second.json()["systemId"]


def test_create_item_requires_manufacturer(client, db):
    refs = _create_references(db)
    payload = _item_payload(refs)
    del payload["manufacturer"]

    response = client.post("/api/v1/items/", json=payload)

    assert response.status_code == 422


def test_create_item_trims_name_and_manufacturer(client, db):
    refs = _create_references(db)
    response = client.post(
        "/api/v1/items/",
        json=_item_payload(refs, name="  Oscyloskop  ", manufacturer="  Rigol  "),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Oscyloskop"
    assert data["manufacturer"] == "Rigol"


def test_create_item_rejects_blank_manufacturer(client, db):
    refs = _create_references(db)
    response = client.post(
        "/api/v1/items/",
        json=_item_payload(refs, manufacturer="   "),
    )

    assert response.status_code == 422


def test_create_item_rejects_name_longer_than_limit(client, db):
    refs = _create_references(db)
    response = client.post("/api/v1/items/", json=_item_payload(refs, name="a" * 101))

    assert response.status_code == 422


def test_create_item_rejects_manufacturer_longer_than_limit(client, db):
    refs = _create_references(db)
    response = client.post(
        "/api/v1/items/",
        json=_item_payload(refs, manufacturer="a" * 101),
    )

    assert response.status_code == 422


def test_get_item_details(client, db):
    refs = _create_references(db)
    created = client.post("/api/v1/items/", json=_item_payload(refs)).json()

    response = client.get(f"/api/v1/items/{created['id']}")

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == created["id"]
    assert data["systemId"] == created["systemId"]
    assert data["name"] == "Oscyloskop"


def test_get_item_not_found(client):
    response = client.get("/api/v1/items/999")

    assert response.status_code == 404


def test_create_item_requires_name(client, db):
    refs = _create_references(db)
    payload = _item_payload(refs)
    del payload["name"]

    response = client.post("/api/v1/items/", json=payload)

    assert response.status_code == 422


def test_create_item_rejects_blank_name(client, db):
    refs = _create_references(db)
    response = client.post("/api/v1/items/", json=_item_payload(refs, name="   "))

    assert response.status_code == 422


def test_create_item_rejects_nonexistent_category(client, db):
    refs = _create_references(db)
    response = client.post(
        "/api/v1/items/",
        json=_item_payload(refs, categoryId=999),
    )

    assert response.status_code == 404


def test_create_item_rejects_nonexistent_status(client, db):
    refs = _create_references(db)
    response = client.post(
        "/api/v1/items/",
        json=_item_payload(refs, statusId=999),
    )

    assert response.status_code == 404


def test_system_id_is_unique_in_database(db):
    refs = _create_references(db)
    added_at = datetime.now(UTC)
    db.add_all(
        [
            Item(
                system_id="ITEM-DUPLICATE",
                name="A",
                manufacturer="Rigol",
                added_at=added_at,
                category_id=refs["categoryId"],
                status_id=refs["statusId"],
            ),
            Item(
                system_id="ITEM-DUPLICATE",
                name="B",
                manufacturer="Rigol",
                added_at=added_at,
                category_id=refs["categoryId"],
                status_id=refs["statusId"],
            ),
        ]
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    else:
        raise AssertionError("Database allowed duplicate item system_id")


def test_frontend_lookup_endpoints(client, db):
    refs = _create_references(db)

    statuses = client.get("/api/v1/statuses/").json()

    assert {
        "id": refs["statusId"],
        "name": "W serwisie",
        "slug": "w_serwisie",
        "type": "custom",
        "description": None,
    } in statuses


def _item_payload(refs, **overrides):
    payload = {
        "name": "Oscyloskop",
        "manufacturer": "Rigol",
        "categoryId": refs["categoryId"],
        "statusId": refs["statusId"],
    }
    payload.update(overrides)
    return payload


def _create_references(db):
    category = Category(name="Aparatura")
    status = ItemStatus(name="W serwisie", is_system=False)
    db.add_all([category, status])
    db.commit()
    db.refresh(category)
    db.refresh(status)
    return {
        "categoryId": category.id,
        "statusId": status.id,
    }
