from datetime import UTC, datetime

from sqlalchemy.exc import IntegrityError

from app.models.category import Category
from app.models.group import Group
from app.models.item import Item
from app.models.item_status import ItemStatus
from app.models.location import Location
from app.models.user import User


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


def test_create_item_with_location_and_owner(client, db):
    refs = _create_references(db)
    location = Location(name="D-17 / 2.14", building="D-17", room="2.14")
    owner = User(email="owner@example.com", hashed_password="hash")
    group = Group(name="Laboratorium")
    db.add_all([location, owner, group])
    db.commit()
    db.refresh(location)
    db.refresh(owner)
    db.refresh(group)

    response = client.post(
        "/api/v1/items/",
        json=_item_payload(
            refs,
            locationId=location.id,
            ownerId=owner.id,
            ownerGroupId=group.id,
        ),
    )

    assert response.status_code == 201
    data = response.json()
    assert data["locationId"] == location.id
    assert data["owner_id"] == owner.id
    assert data["owner_group_id"] == group.id


def test_list_items_filters_sorts_and_paginates(client, db):
    refs = _create_references(db)
    other_category = Category(name="Komputery")
    other_status = ItemStatus(name="W kalibracji", is_system=False)
    db.add_all([other_category, other_status])
    db.commit()
    db.refresh(other_category)
    db.refresh(other_status)

    client.post(
        "/api/v1/items/",
        json=_item_payload(refs, name="Oscyloskop A", manufacturer="Rigol"),
    )
    client.post(
        "/api/v1/items/",
        json=_item_payload(refs, name="Oscyloskop B", manufacturer="Keysight"),
    )
    client.post(
        "/api/v1/items/",
        json=_item_payload(
            {
                "categoryId": other_category.id,
                "statusId": other_status.id,
            },
            name="Laptop",
            manufacturer="Dell",
        ),
    )

    response = client.get(
        "/api/v1/items/",
        params={
            "categoryId": refs["categoryId"],
            "manufacturer": "rig",
            "sortBy": "name",
            "sortDir": "desc",
            "limit": 1,
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Oscyloskop A"


def test_update_status_as_owner(client, auth_headers, item_with_owner):
    statuses = client.get("/api/v1/item-status/").json()
    status_id = statuses[0]["id"]

    response = client.patch(
        f"/api/v1/items/{item_with_owner.id}/status",
        params={"status_id": status_id},
        headers=auth_headers,
    )

    assert response.status_code == 200


def test_update_status_no_permission(client, other_auth_headers, item_with_owner):
    statuses = client.get("/api/v1/item-status/").json()
    status_id = statuses[0]["id"]

    response = client.patch(
        f"/api/v1/items/{item_with_owner.id}/status",
        params={"status_id": status_id},
        headers=other_auth_headers,
    )

    assert response.status_code == 403


def test_update_status_unauthenticated(client, item_with_owner):
    response = client.patch(
        f"/api/v1/items/{item_with_owner.id}/status",
        params={"status_id": 1},
    )

    assert response.status_code == 401


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
