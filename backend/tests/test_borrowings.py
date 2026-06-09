from datetime import UTC, datetime, timedelta

from app.core.security import get_password_hash
from app.models.borrowing import Borrowing, BorrowingMode, BorrowingStatus
from app.models.item import Item
from app.models.item_status import ItemStatus
from app.models.user import User, UserRole


def test_classic_borrowing_flow_requires_owner_return(
    client,
    db,
    auth_headers,
    other_auth_headers,
    user,
    other_user,
):
    item = _create_owned_item(db, user)
    borrowing_id = _request(client, item.id, other_auth_headers, "classic")

    approved = client.patch(
        f"/api/v1/borrowings/{borrowing_id}/approve",
        headers=auth_headers,
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "reserved"
    assert _item_status(db, item.id) == "Zarezerwowany"

    handed_over = client.patch(
        f"/api/v1/borrowings/{borrowing_id}/handover",
        headers=auth_headers,
    )
    assert handed_over.status_code == 200
    assert handed_over.json()["status"] == "borrowed"
    assert _item_status(db, item.id) == "Wypożyczony"

    borrower_return = client.patch(
        f"/api/v1/borrowings/{borrowing_id}/return",
        json={"comment": "Oddaję"},
        headers=other_auth_headers,
    )
    assert borrower_return.status_code == 403

    owner_return = client.patch(
        f"/api/v1/borrowings/{borrowing_id}/return",
        json={"comment": "Bez uszkodzeń"},
        headers=auth_headers,
    )
    assert owner_return.status_code == 200
    assert owner_return.json()["status"] == "returned"
    assert owner_return.json()["returnComment"] == "Bez uszkodzeń"
    assert _item_status(db, item.id) == "Dostępny"
    logs = client.get("/api/v1/audit-logs/").json()
    actions = [log["action"] for log in logs if log["item_id"] == item.id]
    assert "BORROWING_REQUESTED" in actions
    assert "BORROWING_APPROVED" in actions
    assert "ITEM_BORROWED" in actions
    assert "BORROWING_RETURNED" in actions


def test_trusted_borrower_can_return_item(
    client,
    db,
    auth_headers,
    other_auth_headers,
    user,
):
    item = _create_owned_item(db, user)
    borrowing_id = _request(client, item.id, other_auth_headers, "trusted")
    client.patch(f"/api/v1/borrowings/{borrowing_id}/approve", headers=auth_headers)
    client.patch(f"/api/v1/borrowings/{borrowing_id}/handover", headers=auth_headers)

    response = client.patch(
        f"/api/v1/borrowings/{borrowing_id}/return",
        json={},
        headers=other_auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["status"] == "returned"
    assert _item_status(db, item.id) == "Dostępny"


def test_async_borrower_can_pick_up_and_return_item(
    client,
    db,
    auth_headers,
    other_auth_headers,
    user,
):
    item = _create_owned_item(db, user)
    borrowing_id = _request(client, item.id, other_auth_headers, "asynchronous")
    client.patch(f"/api/v1/borrowings/{borrowing_id}/approve", headers=auth_headers)

    handover = client.patch(
        f"/api/v1/borrowings/{borrowing_id}/handover",
        headers=other_auth_headers,
    )
    returned = client.patch(
        f"/api/v1/borrowings/{borrowing_id}/return",
        json={},
        headers=other_auth_headers,
    )

    assert handover.status_code == 200
    assert handover.json()["status"] == "borrowed"
    assert returned.status_code == 200
    assert returned.json()["status"] == "returned"


def test_external_borrowing_sets_item_borrowed(client, db, auth_headers, user):
    item = _create_owned_item(db, user)

    response = client.post(
        "/api/v1/borrowings/external",
        json={
            "itemId": item.id,
            "externalBorrower": "Gość z CERN",
            "plannedReturnAt": (datetime.now(UTC) + timedelta(days=7)).isoformat(),
        },
        headers=auth_headers,
    )

    assert response.status_code == 201
    assert response.json()["mode"] == "external"
    assert response.json()["status"] == "borrowed"
    assert response.json()["externalBorrower"] == "Gość z CERN"
    assert _item_status(db, item.id) == "Wypożyczony"


def test_owner_overdue_report_and_csv_pdf_exports(client, db, auth_headers, user):
    item = _create_owned_item(db, user)
    _create_overdue_borrowing(db, item, user)

    report = client.get("/api/v1/borrowings/overdue", headers=auth_headers)
    csv_response = client.get("/api/v1/borrowings/overdue.csv", headers=auth_headers)
    pdf_response = client.get("/api/v1/borrowings/overdue.pdf", headers=auth_headers)

    assert report.status_code == 200
    assert report.json()[0]["itemId"] == item.id
    assert report.json()[0]["daysOverdue"] >= 1
    assert csv_response.status_code == 200
    assert "text/csv" in csv_response.headers["content-type"]
    assert item.name in csv_response.text
    assert pdf_response.status_code == 200
    assert pdf_response.headers["content-type"] == "application/pdf"


def test_admin_can_report_all_overdue_items(client, db, user):
    owner = user
    other_owner = User(
        email="third@test.com", hashed_password=get_password_hash("password123")
    )
    admin = User(
        email="admin@test.com",
        hashed_password=get_password_hash("password123"),
        role=UserRole.admin,
    )
    db.add_all([other_owner, admin])
    db.commit()
    db.refresh(other_owner)
    db.refresh(admin)
    _create_overdue_borrowing(db, _create_owned_item(db, owner), owner)
    _create_overdue_borrowing(db, _create_owned_item(db, other_owner), other_owner)

    token = client.post(
        "/api/v1/auth/token",
        data={"username": admin.email, "password": "password123"},
    ).json()["access_token"]
    response = client.get(
        "/api/v1/borrowings/overdue?includeAll=true",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert len(response.json()) == 2


def _request(client, item_id: int, headers: dict[str, str], mode: str) -> int:
    response = client.post(
        "/api/v1/borrowings/requests",
        json={
            "itemId": item_id,
            "mode": mode,
            "plannedReturnAt": (datetime.now(UTC) + timedelta(days=3)).isoformat(),
        },
        headers=headers,
    )
    assert response.status_code == 201
    assert response.json()["status"] == "pending"
    return response.json()["id"]


def _create_owned_item(db, owner: User) -> Item:
    available = db.query(ItemStatus).filter(ItemStatus.name == "Dostępny").first()
    assert available is not None
    item = Item(
        name=f"Test Item {owner.id}",
        owner_id=owner.id,
        status_id=available.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _create_overdue_borrowing(db, item: Item, borrower: User) -> Borrowing:
    borrowed = db.query(ItemStatus).filter(ItemStatus.name == "Wypożyczony").first()
    assert borrowed is not None
    item.status_id = borrowed.id
    borrowing = Borrowing(
        item_id=item.id,
        borrower_id=borrower.id,
        mode=BorrowingMode.classic,
        status=BorrowingStatus.borrowed,
        planned_return_at=datetime.now(UTC) - timedelta(days=2),
        approved_at=datetime.now(UTC) - timedelta(days=3),
        handed_over_at=datetime.now(UTC) - timedelta(days=3),
    )
    db.add(borrowing)
    db.commit()
    db.refresh(borrowing)
    return borrowing


def _item_status(db, item_id: int) -> str:
    item = db.query(Item).filter(Item.id == item_id).first()
    db.refresh(item)
    return item.status.name
