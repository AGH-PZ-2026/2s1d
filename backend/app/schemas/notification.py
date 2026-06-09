from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.notification import NotificationChannel, NotificationEventType


class NotificationPreferenceUpdate(BaseModel):
    email_enabled: bool = Field(alias="emailEnabled")
    push_enabled: bool = Field(alias="pushEnabled")
    return_due_notice_hours: int = Field(alias="returnDueNoticeHours", ge=1, le=720)

    model_config = ConfigDict(populate_by_name=True)


class NotificationPreferenceResponse(NotificationPreferenceUpdate):
    id: int
    user_id: int = Field(serialization_alias="userId")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class NotificationEventResponse(BaseModel):
    id: int
    user_id: int = Field(serialization_alias="userId")
    borrowing_id: int | None = Field(default=None, serialization_alias="borrowingId")
    event_type: NotificationEventType = Field(serialization_alias="eventType")
    channel: NotificationChannel
    payload: str
    scheduled_at: datetime = Field(serialization_alias="scheduledAt")
    sent_at: datetime | None = Field(default=None, serialization_alias="sentAt")
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
