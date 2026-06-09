from app.core.security import get_password_hash
from app.models.user import User, UserRole


def test_register_success(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "new@test.com", "password": "password123"},
    )
    assert response.status_code == 201
    assert response.json()["email"] == "new@test.com"
    assert response.json()["role"] == "user"
    assert response.json()["is_active"] is False
    assert response.json()["is_approved"] is False


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


def test_registered_user_cannot_login_before_approval(client):
    client.post(
        "/api/v1/auth/register",
        json={"email": "pending@test.com", "password": "password123"},
    )

    response = client.post(
        "/api/v1/auth/token",
        data={"username": "pending@test.com", "password": "password123"},
    )

    assert response.status_code == 403
    assert "zatwierdzenia" in response.json()["detail"]


def test_admin_can_approve_registered_user(client, db):
    registered = client.post(
        "/api/v1/auth/register",
        json={"email": "approve@test.com", "password": "password123"},
    ).json()
    admin = User(
        email="approver@test.com",
        hashed_password=get_password_hash("password123"),
        role=UserRole.admin,
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    token = client.post(
        "/api/v1/auth/token",
        data={"username": admin.email, "password": "password123"},
    ).json()["access_token"]

    response = client.patch(
        f"/api/v1/auth/users/{registered['id']}/approve",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["is_active"] is True
    assert response.json()["is_approved"] is True


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
