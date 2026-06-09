from datetime import UTC, datetime, timedelta

from app.models.borrowing import Borrowing, BorrowingMode, BorrowingStatus
from app.models.item import Item
from app.models.item_status import ItemStatus


def test_user_can_configure_notification_preferences(client, auth_headers):
    response = client.put(
        "/api/v1/notifications/preferences",
        json={
            "emailEnabled": True,
            "pushEnabled": True,
            "returnDueNoticeHours": 48,
        },
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["emailEnabled"] is True
    assert response.json()["pushEnabled"] is True
    assert response.json()["returnDueNoticeHours"] == 48


def test_approval_queues_notification_for_borrower(
    client,
    db,
    auth_headers,
    other_auth_headers,
    user,
):
    item = _create_item(db, user.id)
    borrowing_id = client.post(
        "/api/v1/borrowings/requests",
        json={"itemId": item.id, "mode": "classic"},
        headers=other_auth_headers,
    ).json()["id"]

    response = client.patch(
        f"/api/v1/borrowings/{borrowing_id}/approve",
        headers=auth_headers,
    )
    events = client.get(
        "/api/v1/notifications/events",
        headers=other_auth_headers,
    )

    assert response.status_code == 200
    assert events.status_code == 200
    assert any(event["eventType"] == "borrowing_approved" for event in events.json())


def test_due_reminder_queue_and_dispatch_respects_preferences(
    client, db, other_auth_headers, other_user
):
    client.put(
        "/api/v1/notifications/preferences",
        json={
            "emailEnabled": True,
            "pushEnabled": True,
            "returnDueNoticeHours": 24,
        },
        headers=other_auth_headers,
    )
    item = _create_item(db, other_user.id)
    _create_due_borrowing(db, item.id, other_user.id)

    queued = client.post("/api/v1/notifications/queue-due-reminders")
    dispatch = client.post("/api/v1/notifications/dispatch-pending")
    events = client.get("/api/v1/notifications/events", headers=other_auth_headers)

    assert queued.status_code == 200
    assert queued.json()["queued"] == 2
    assert dispatch.status_code == 200
    assert dispatch.json()["sent"] == 2
    assert {event["channel"] for event in events.json()} == {"email", "push"}
    assert all(event["eventType"] == "return_due" for event in events.json())
    assert all(event["sentAt"] is not None for event in events.json())


def _create_item(db, owner_id: int) -> Item:
    available = db.query(ItemStatus).filter(ItemStatus.name == "Dostępny").first()
    item = Item(name="Przedmiot z powiadomieniem", owner_id=owner_id)
    if available is not None:
        item.status_id = available.id
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def _create_due_borrowing(db, item_id: int, borrower_id: int) -> Borrowing:
    borrowing = Borrowing(
        item_id=item_id,
        borrower_id=borrower_id,
        mode=BorrowingMode.classic,
        status=BorrowingStatus.borrowed,
        planned_return_at=datetime.now(UTC) + timedelta(hours=12),
    )
    db.add(borrowing)
    db.commit()
    db.refresh(borrowing)
    return borrowing
