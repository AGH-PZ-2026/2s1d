from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.group import GroupCreate, GroupMemberUpdate, GroupResponse
from app.services import group as service

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("/", response_model=list[GroupResponse])
def list_groups(db: Session = Depends(get_db)):
    return service.list_groups(db)


@router.post("/", response_model=GroupResponse, status_code=201)
def create_group(
    data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return service.create_group(db, data)


@router.post("/{group_id}/members", response_model=GroupResponse)
def add_member(
    group_id: int,
    data: GroupMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return service.add_member(db, group_id, data.user_id)


@router.delete("/{group_id}/members/{user_id}", status_code=204)
def remove_member(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    service.remove_member(db, group_id, user_id)
