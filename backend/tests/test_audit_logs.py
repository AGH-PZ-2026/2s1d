from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_audit_logs_endpoint():
    # Symulujemy wejście na Twój nowy endpoint
    response = client.get("/api/v1/audit-logs/")
    
    # Sprawdzamy, czy serwer odpowiada statusem 200 (OK)
    assert response.status_code == 200
    
    # Sprawdzamy, czy domyślnie zwraca listę
    assert isinstance(response.json(), list)