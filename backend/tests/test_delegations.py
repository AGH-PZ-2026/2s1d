def test_add_delegation_as_owner(client, auth_headers, item_with_owner, other_user):
    response = client.post(
        f"/api/v1/items/{item_with_owner.id}/delegations/",
        json={"user_id": other_user.id, "permission": "edit"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    assert response.json()["permission"] == "edit"
    logs = client.get("/api/v1/audit-logs/").json()
    assert any(
        log["action"] == "DELEGATES_CHANGED" and log["item_id"] == item_with_owner.id
        for log in logs
    )


def test_add_delegation_not_owner(
    client, other_auth_headers, item_with_owner, other_user
):
    response = client.post(
        f"/api/v1/items/{item_with_owner.id}/delegations/",
        json={"user_id": other_user.id, "permission": "edit"},
        headers=other_auth_headers,
    )
    assert response.status_code == 403


def test_delegate_manage_cannot_add_delegation(
    client, auth_headers, item_with_owner, other_user, other_auth_headers
):
    client.post(
        f"/api/v1/items/{item_with_owner.id}/delegations/",
        json={"user_id": other_user.id, "permission": "manage"},
        headers=auth_headers,
    )
    response = client.post(
        f"/api/v1/items/{item_with_owner.id}/delegations/",
        json={"user_id": 999, "permission": "edit"},
        headers=other_auth_headers,
    )
    assert response.status_code == 403


def test_delegate_edit_can_update_status(
    client, auth_headers, item_with_owner, other_user, other_auth_headers
):
    client.post(
        f"/api/v1/items/{item_with_owner.id}/delegations/",
        json={"user_id": other_user.id, "permission": "edit"},
        headers=auth_headers,
    )
    statuses = client.get("/api/v1/item-status/").json()
    response = client.patch(
        f"/api/v1/items/{item_with_owner.id}/status",
        params={"status_id": statuses[0]["id"]},
        headers=other_auth_headers,
    )
    assert response.status_code == 200


def test_delegate_edit_cannot_update_location(
    client, auth_headers, item_with_owner, other_user, other_auth_headers
):
    client.post(
        f"/api/v1/items/{item_with_owner.id}/delegations/",
        json={"user_id": other_user.id, "permission": "edit"},
        headers=auth_headers,
    )
    response = client.patch(
        f"/api/v1/items/{item_with_owner.id}/location",
        params={"location": "Room 101"},
        headers=other_auth_headers,
    )
    assert response.status_code == 403


def test_delegate_edit_can_update_description(
    client, auth_headers, item_with_owner, other_user, other_auth_headers
):
    client.post(
        f"/api/v1/items/{item_with_owner.id}/delegations/",
        json={"user_id": other_user.id, "permission": "edit"},
        headers=auth_headers,
    )
    response = client.patch(
        f"/api/v1/items/{item_with_owner.id}/description",
        params={"description": "New description"},
        headers=other_auth_headers,
    )
    assert response.status_code == 200


def test_remove_delegation(client, auth_headers, item_with_owner, other_user):
    create = client.post(
        f"/api/v1/items/{item_with_owner.id}/delegations/",
        json={"user_id": other_user.id, "permission": "edit"},
        headers=auth_headers,
    )
    delegation_id = create.json()["id"]
    response = client.delete(
        f"/api/v1/items/{item_with_owner.id}/delegations/{delegation_id}",
        headers=auth_headers,
    )
    assert response.status_code == 204


def test_get_delegations(client, auth_headers, item_with_owner):
    response = client.get(
        f"/api/v1/items/{item_with_owner.id}/delegations/",
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)
