def test_register_success(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "new@test.com", "password": "password123"},
    )
    assert response.status_code == 201
    assert response.json()["email"] == "new@test.com"
    assert response.json()["role"] == "user"


def test_register_invalid_email(client):
    response = client.post(
        "/api/v1/auth/register", json={"email": "notanemail", "password": "password123"}
    )
    assert response.status_code == 422


def test_register_password_too_short(client):
    response = client.post(
        "/api/v1/auth/register", json={"email": "test@test.com", "password": "short"}
    )
    assert response.status_code == 422


def test_register_duplicate_email(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "dup@test.com", "password": "password123"},
    )
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "dup@test.com", "password": "password123"},
    )
    assert response.status_code == 400


def test_login_success(client, user):
    response = client.post(
        "/api/v1/auth/token",
        data={
            "username": user.email,
            "password": "password123",
        },
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_login_wrong_password(client, user):
    response = client.post(
        "/api/v1/auth/token",
        data={
            "username": user.email,
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401


def test_login_wrong_email(client):
    response = client.post(
        "/api/v1/auth/token",
        data={
            "username": "noexist@test.com",
            "password": "password123",
        },
    )
    assert response.status_code == 401
