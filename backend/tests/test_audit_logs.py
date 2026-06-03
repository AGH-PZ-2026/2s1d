def test_get_audit_logs_endpoint(client):
    # Używamy wstrzykniętego 'client' zamiast definiować go od nowa
    response = client.get("/api/v1/audit-logs/")

    assert response.status_code == 200
    assert isinstance(response.json(), list)
