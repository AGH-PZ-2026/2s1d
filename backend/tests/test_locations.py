from app.models.item import Item


def test_create_internal_location(client):
    response = client.post(
        "/api/v1/locations/",
        json={
            "name": "Budynek D-17, pokój 2.14, szafa A",
            "kind": "internal",
            "building": "D-17",
            "room": "2.14",
            "cabinet": "A",
            "shelf": "3",
            "mapX": 12.5,
            "mapY": 8.0,
        },
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Budynek D-17, pokój 2.14, szafa A"
    assert data["kind"] == "internal"
    assert data["building"] == "D-17"
    assert data["mapX"] == 12.5


def test_create_external_location(client):
    response = client.post(
        "/api/v1/locations/",
        json={
            "name": "CERN",
            "kind": "external",
            "notes": "Delegacja zewnętrzna",
        },
    )

    assert response.status_code == 201
    assert response.json()["kind"] == "external"


def test_update_location(client):
    location_id = client.post(
        "/api/v1/locations/",
        json={"name": "Pokój 1", "kind": "internal"},
    ).json()["id"]

    response = client.patch(
        f"/api/v1/locations/{location_id}",
        json={"room": "1.02", "cabinet": "B"},
    )

    assert response.status_code == 200
    assert response.json()["room"] == "1.02"
    assert response.json()["cabinet"] == "B"


def test_delete_location_used_by_item_deactivates(client, db):
    location_id = client.post(
        "/api/v1/locations/",
        json={"name": "Magazyn", "kind": "internal"},
    ).json()["id"]
    db.add(Item(name="Przedmiot z lokalizacją", location_id=location_id))
    db.commit()

    response = client.delete(f"/api/v1/locations/{location_id}")

    assert response.status_code == 204
    active = client.get("/api/v1/locations/").json()
    assert all(location["id"] != location_id for location in active)
    all_locations = client.get("/api/v1/locations/?include_inactive=true").json()
    assert any(location["id"] == location_id for location in all_locations)
