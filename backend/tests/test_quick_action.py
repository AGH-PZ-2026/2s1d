def test_get_item_details_success(client):
    response = client.get("/api/v1/quick-actions/1")
    assert response.status_code == 200
    assert response.json()["name"] == "Laptop Dell"
    assert response.json()["location"] == "Biuro 101"


def test_mark_damaged_as_owner(client):
    response = client.patch(
        "/api/v1/quick-actions/1/mark-damaged", json={"user_id": 10}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "damaged"


def test_mark_damaged_as_delegate(client):
    response = client.patch(
        "/api/v1/quick-actions/2/mark-damaged", json={"user_id": 999}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "damaged"


def test_mark_damaged_forbidden(client):
    response = client.patch(
        "/api/v1/quick-actions/1/mark-damaged", json={"user_id": 15}
    )
    assert response.status_code == 403
    assert "Brak uprawnień" in response.json()["detail"]
