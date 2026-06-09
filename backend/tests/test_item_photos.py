from pathlib import Path

from app.models.item import Item


def test_any_authenticated_user_can_add_item_photo(
    client,
    db,
    other_auth_headers,
    user,
):
    item = _create_item(db, user.id)

    response = client.post(
        f"/api/v1/items/{item.id}/photos/",
        files={"file": ("stan.png", b"\x89PNG\r\n\x1a\n", "image/png")},
        headers=other_auth_headers,
    )

    assert response.status_code == 201
    data = response.json()
    assert data["itemId"] == item.id
    assert data["originalFilename"] == "stan.png"
    assert data["contentType"] == "image/png"
    assert data["addedAt"] is not None
    assert Path(data["storagePath"]).exists()

    logs = client.get("/api/v1/audit-logs/").json()
    assert any(
        log["action"] == "PHOTO_ADDED" and log["item_id"] == item.id for log in logs
    )


def test_list_item_photo_history(client, db, auth_headers, user):
    item = _create_item(db, user.id)
    for filename in ["a.jpg", "b.jpg"]:
        response = client.post(
            f"/api/v1/items/{item.id}/photos/",
            files={"file": (filename, b"jpeg", "image/jpeg")},
            headers=auth_headers,
        )
        assert response.status_code == 201

    list_response = client.get(f"/api/v1/items/{item.id}/photos/")

    assert list_response.status_code == 200
    data = list_response.json()
    assert len(data) == 2
    assert {photo["originalFilename"] for photo in data} == {"a.jpg", "b.jpg"}


def test_reject_non_image_upload(client, db, auth_headers, user):
    item = _create_item(db, user.id)

    response = client.post(
        f"/api/v1/items/{item.id}/photos/",
        files={"file": ("notes.txt", b"text", "text/plain")},
        headers=auth_headers,
    )

    assert response.status_code == 415


def _create_item(db, owner_id: int) -> Item:
    item = Item(name="Przedmiot ze zdjęciami", owner_id=owner_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
