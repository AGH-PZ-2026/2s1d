def test_get_all_statuses(client):
    response = client.get("/api/v1/item-status/")
    data = response.json()
    assert response.status_code == 200
    assert len(data) == 5
    assert any(s["name"] == "Dostępny" for s in data)
    
def test_create_status(client):
    response = client.post("/api/v1/item-status/", json={"name": "Test"})
    assert response.status_code == 201
    assert response.json()["name"] == "Test"
    assert response.json()["is_system"] is False
    
def test_delete_custom_status(client):
    custom_status = client.post("/api/v1/item-status/", json={"name": "Test"})
    status_id = custom_status.json()["id"]
    response = client.delete(f"/api/v1/item-status/{status_id}")
    assert response.status_code == 204
    
def test_delete_system_status_forbidden(client):
    all_statuses = client.get("/api/v1/item-status/").json()
    system_status_id = next(s["id"] for s in all_statuses if s["is_system"])
    response = client.delete(f"/api/v1/item-status/{system_status_id}")
    assert response.status_code == 403
    
    
def test_update_custom_status(client):
    custom_status = client.post("/api/v1/item-status/", json={"name": "Old name"})
    status_id = custom_status.json()["id"]
    response = client.put(f"/api/v1/item-status/{status_id}", json={"name": "New name"})
    assert response.status_code == 200
    assert response.json()["name"] == "New name"
    
def test_update_system_status_forbidden(client):
    all_statuses = client.get("/api/v1/item-status/").json()
    system_status_id = next(s["id"] for s in all_statuses if s["is_system"])
    response = client.put(
        f"/api/v1/item-status/{system_status_id}", json={"name": "Test"}
    )
    assert response.status_code == 403
    
def test_delete_not_found(client):
    response = client.delete("/api/v1/item-status/99999999")
    assert response.status_code == 404
    
def test_update_not_found(client):
    response = client.put("/api/v1/item-status/9999999", json={"name": "Test"})
    assert response.status_code == 404