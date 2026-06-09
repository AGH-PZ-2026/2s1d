import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class NotificationChannel(str, enum.Enum):
    email = "email"
    push = "push"


class NotificationEventType(str, enum.Enum):
    return_due = "return_due"
    borrowing_approved = "borrowing_approved"


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    email_enabled = Column(Boolean, nullable=False, default=True)
    push_enabled = Column(Boolean, nullable=False, default=False)
    return_due_notice_hours = Column(Integer, nullable=False, default=24)

    user = relationship("User")


class NotificationEvent(Base):
    __tablename__ = "notification_events"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    borrowing_id = Column(Integer, ForeignKey("borrowings.id"), nullable=True)
    event_type = Column(Enum(NotificationEventType), nullable=False)
    channel = Column(Enum(NotificationChannel), nullable=False)
    payload = Column(String(1000), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user = relationship("User")
    borrowing = relationship("Borrowing")
