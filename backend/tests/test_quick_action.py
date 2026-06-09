from app.models.delegation import Delegation, PermissionLevel
from app.models.item import Item
from app.models.item_status import ItemStatus
from app.models.location import Location
from app.models.user import User


def test_get_item_details_success(client, db):
    item = _create_quick_action_item(db)

    response = client.get(f"/api/v1/quick-actions/{item.id}")

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Laptop Dell"
    assert data["location"] == "Biuro 101"
    assert data["status"] == "Dostępny"


def test_mark_damaged_as_owner(client, db):
    item = _create_quick_action_item(db)

    response = client.patch(
        f"/api/v1/quick-actions/{item.id}/mark-damaged",
        json={"user_id": item.owner_id},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "Uszkodzony"


def test_mark_damaged_as_delegate(client, db):
    item = _create_quick_action_item(db)
    delegate = User(email="delegate@example.com", hashed_password="hash")
    db.add(delegate)
    db.commit()
    db.refresh(delegate)
    db.add(
        Delegation(
            item_id=item.id,
            user_id=delegate.id,
            permission=PermissionLevel.edit,
        )
    )
    db.commit()

    response = client.patch(
        f"/api/v1/quick-actions/{item.id}/mark-damaged",
        json={"user_id": delegate.id},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "Uszkodzony"


def test_mark_damaged_forbidden(client, db):
    item = _create_quick_action_item(db)

    response = client.patch(
        f"/api/v1/quick-actions/{item.id}/mark-damaged",
        json={"user_id": 9999},
    )

    assert response.status_code == 403
    assert "Brak uprawnień" in response.json()["detail"]


def _create_quick_action_item(db):
    available = db.query(ItemStatus).filter(ItemStatus.name == "Dostępny").first()
    damaged = db.query(ItemStatus).filter(ItemStatus.name == "Uszkodzony").first()
    owner = User(email="owner@example.com", hashed_password="hash")
    location = Location(name="Biuro 101", room="101")
    db.add_all([owner, location])
    db.commit()
    db.refresh(owner)
    db.refresh(location)

    assert available is not None
    assert damaged is not None
    item = Item(
        name="Laptop Dell",
        status_id=available.id,
        owner_id=owner.id,
        location_id=location.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
