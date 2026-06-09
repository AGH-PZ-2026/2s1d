import os

os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.core.security import get_password_hash  # noqa: E402
from app.db.session import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.borrowing import Borrowing  # noqa: E402,F401
from app.models.delegation import Delegation  # noqa: E402,F401
from app.models.group import Group  # noqa: E402,F401
from app.models.item import Item  # noqa: E402,F401
from app.models.item_photo import ItemPhoto  # noqa: E402,F401
from app.models.location import Location  # noqa: E402,F401
from app.models.notification import (  # noqa: E402,F401
    NotificationEvent,  # noqa: E402,F401
    NotificationPreference,  # noqa: E402,F401
)
from app.models.user import User  # noqa: E402,F401
from app.services.item_status import init_system_statuses  # noqa: E402

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        init_system_statuses(db)
    finally:
        db.close()


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def user(db):
    u = User(email="test@test.com", hashed_password=get_password_hash("password123"))
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def other_user(db):
    u = User(email="other@test.com", hashed_password=get_password_hash("password123"))
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@pytest.fixture
def auth_headers(client, user):
    response = client.post(
        "/api/v1/auth/token",
        data={
            "username": user.email,
            "password": "password123",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_auth_headers(client, other_user):
    response = client.post(
        "/api/v1/auth/token",
        data={
            "username": other_user.email,
            "password": "password123",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def item_with_owner(db, user):
    item = Item(name="Test Item", owner_id=user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
