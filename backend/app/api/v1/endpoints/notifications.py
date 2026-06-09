from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.notification import (
    NotificationEventResponse,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
)
from app.services import notification as service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/preferences", response_model=NotificationPreferenceResponse)
def get_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_or_create_preferences(db, current_user)


@router.put("/preferences", response_model=NotificationPreferenceResponse)
def update_preferences(
    data: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.update_preferences(db, current_user, data)


@router.get("/events", response_model=list[NotificationEventResponse])
def list_events(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.list_events(db, current_user)


@router.post("/queue-due-reminders")
def queue_due_reminders(db: Session = Depends(get_db)):
    return {"queued": service.queue_due_reminders(db)}


@router.post("/dispatch-pending")
def dispatch_pending(db: Session = Depends(get_db)):
    return {"sent": service.dispatch_pending_events(db)}
