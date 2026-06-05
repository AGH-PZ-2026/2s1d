def test_get_audit_logs_endpoint(client):
    response = client.get("/api/v1/audit-logs/")

    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_and_fetch_audit_log(client):
    create_payload = {
        "user_id": 1,
        "action": "ITEM_CREATED",
        "entity_id": 123,
        "details": "Test create and fetch",
    }
    post_response = client.post("/api/v1/audit-logs/", json=create_payload)
    assert post_response.status_code == 200

    get_response = client.get("/api/v1/audit-logs/")
    assert get_response.status_code == 200
    data = get_response.json()

    assert any(log["details"] == "Test create and fetch" for log in data)
