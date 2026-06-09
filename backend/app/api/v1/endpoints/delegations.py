from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.delegation import DelegationCreate, DelegationResponse
from app.services import delegation as service

router = APIRouter(prefix="/items/{item_id}/delegations", tags=["delegations"])


@router.get("/", response_model=list[DelegationResponse])
def get_delegations(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_delegations(item_id, db)


@router.post("/", response_model=DelegationResponse, status_code=201)
def add_delegation(
    item_id: int,
    data: DelegationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.add_delegation(item_id, data, current_user, db)


@router.delete("/{delegation_id}", status_code=204)
def remove_delegation(
    item_id: int,
    delegation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service.remove_delegation(item_id, delegation_id, current_user, db)
