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


def test_update_description_as_owner(client, auth_headers, item_with_owner):
    response = client.patch(
        f"/api/v1/items/{item_with_owner.id}/description",
        params={"description": "New description"},
        headers=auth_headers,
    )
    assert response.status_code == 200


def test_update_description_no_permission(client, other_auth_headers, item_with_owner):
    response = client.patch(
        f"/api/v1/items/{item_with_owner.id}/description",
        params={"description": "New description"},
        headers=other_auth_headers,
    )
    assert response.status_code == 403


def test_update_location_as_owner(client, auth_headers, item_with_owner):
    response = client.patch(
        f"/api/v1/items/{item_with_owner.id}/location",
        params={"location": "Room 101"},
        headers=auth_headers,
    )
    assert response.status_code == 200


def test_update_location_no_permission(client, other_auth_headers, item_with_owner):
    response = client.patch(
        f"/api/v1/items/{item_with_owner.id}/location",
        params={"location": "Room 101"},
        headers=other_auth_headers,
    )
    assert response.status_code == 403
