def test_admin_can_create_group_and_manage_members(client, user):
    created = client.post("/api/v1/groups/", json={"name": "  Laboratorium Pomiary  "})

    assert created.status_code == 201
    assert created.json()["name"] == "Laboratorium Pomiary"

    group_id = created.json()["id"]
    added = client.post(
        f"/api/v1/groups/{group_id}/members",
        json={"user_id": user.id},
    )
    listed = client.get("/api/v1/groups/")
    removed = client.delete(f"/api/v1/groups/{group_id}/members/{user.id}")

    assert added.status_code == 200
    assert added.json()["members"] == [{"id": user.id, "email": user.email}]
    assert listed.status_code == 200
    assert listed.json()[0]["members"] == [{"id": user.id, "email": user.email}]
    assert removed.status_code == 204


def test_non_admin_cannot_create_group(client, auth_headers):
    response = client.post(
        "/api/v1/groups/",
        json={"name": "Nieuprawniona grupa"},
        headers=auth_headers,
    )

    assert response.status_code == 403
