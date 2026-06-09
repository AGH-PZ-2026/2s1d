from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.models.borrowing import Borrowing, BorrowingStatus
from app.models.notification import (
    NotificationChannel,
    NotificationEvent,
    NotificationEventType,
    NotificationPreference,
)
from app.models.user import User
from app.schemas.notification import NotificationPreferenceUpdate


def get_or_create_preferences(db: Session, user: User) -> NotificationPreference:
    preference = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == user.id)
        .first()
    )
    if preference is None:
        preference = NotificationPreference(user_id=user.id)
        db.add(preference)
        db.commit()
        db.refresh(preference)
    return preference


def update_preferences(
    db: Session,
    user: User,
    data: NotificationPreferenceUpdate,
) -> NotificationPreference:
    preference = get_or_create_preferences(db, user)
    preference.email_enabled = data.email_enabled
    preference.push_enabled = data.push_enabled
    preference.return_due_notice_hours = data.return_due_notice_hours
    db.commit()
    db.refresh(preference)
    return preference


def list_events(db: Session, user: User) -> list[NotificationEvent]:
    return (
        db.query(NotificationEvent)
        .filter(NotificationEvent.user_id == user.id)
        .order_by(NotificationEvent.created_at.desc())
        .all()
    )


def queue_borrowing_approved(db: Session, borrowing: Borrowing) -> None:
    if borrowing.borrower_id is None:
        return
    preference = _preference_for_user_id(db, borrowing.borrower_id)
    _queue_for_enabled_channels(
        db,
        preference,
        borrowing_id=borrowing.id,
        event_type=NotificationEventType.borrowing_approved,
        payload=f"Prośba o wypożyczenie przedmiotu #{borrowing.item_id} zaakceptowana",
        scheduled_at=datetime.now(UTC),
    )


def queue_due_reminders(db: Session, now: datetime | None = None) -> int:
    now = now or datetime.now(UTC)
    queued = 0
    borrowings = (
        db.query(Borrowing)
        .filter(
            Borrowing.status == BorrowingStatus.borrowed,
            Borrowing.borrower_id.is_not(None),
            Borrowing.planned_return_at.is_not(None),
        )
        .all()
    )
    for borrowing in borrowings:
        preference = _preference_for_user_id(db, borrowing.borrower_id)
        planned_return_at = _as_aware(borrowing.planned_return_at)
        notice_at = planned_return_at - timedelta(
            hours=preference.return_due_notice_hours
        )
        if notice_at <= now <= planned_return_at:
            queued += _queue_for_enabled_channels(
                db,
                preference,
                borrowing_id=borrowing.id,
                event_type=NotificationEventType.return_due,
                payload=f"Termin zwrotu przedmiotu #{borrowing.item_id} zbliża się",
                scheduled_at=now,
            )
    return queued


def _as_aware(value: datetime) -> datetime:
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)


def _preference_for_user_id(db: Session, user_id: int) -> NotificationPreference:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise ValueError("User not found")
    return get_or_create_preferences(db, user)


def _queue_for_enabled_channels(
    db: Session,
    preference: NotificationPreference,
    *,
    borrowing_id: int,
    event_type: NotificationEventType,
    payload: str,
    scheduled_at: datetime,
) -> int:
    queued = 0
    if preference.email_enabled:
        queued += _create_event(
            db,
            preference,
            borrowing_id,
            event_type,
            NotificationChannel.email,
            payload,
            scheduled_at,
        )
    if preference.push_enabled:
        queued += _create_event(
            db,
            preference,
            borrowing_id,
            event_type,
            NotificationChannel.push,
            payload,
            scheduled_at,
        )
    return queued


def _create_event(
    db: Session,
    preference: NotificationPreference,
    borrowing_id: int,
    event_type: NotificationEventType,
    channel: NotificationChannel,
    payload: str,
    scheduled_at: datetime,
) -> int:
    exists = (
        db.query(NotificationEvent)
        .filter(
            NotificationEvent.user_id == preference.user_id,
            NotificationEvent.borrowing_id == borrowing_id,
            NotificationEvent.event_type == event_type,
            NotificationEvent.channel == channel,
        )
        .first()
    )
    if exists is not None:
        return 0
    db.add(
        NotificationEvent(
            user_id=preference.user_id,
            borrowing_id=borrowing_id,
            event_type=event_type,
            channel=channel,
            payload=payload,
            scheduled_at=scheduled_at,
        )
    )
    db.commit()
    return 1
