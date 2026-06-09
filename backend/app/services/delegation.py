from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.delegation import Delegation, PermissionLevel
from app.models.item import Item
from app.models.user import User
from app.schemas.audit_log import AuditLogAction
from app.schemas.delegation import DelegationCreate
from app.services.audit_log import record_audit_log


def get_delegations(item_id: int, db: Session):
    return db.query(Delegation).filter(Delegation.item_id == item_id).all()


def add_delegation(
    item_id: int, data: DelegationCreate, current_user: User, db: Session
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can add delegates")
    if not data.user_id and not data.group_id:
        raise HTTPException(status_code=400, detail="Provide user_id or group_id")
    delegation = Delegation(
        item_id=item_id,
        user_id=data.user_id,
        group_id=data.group_id,
        permission=data.permission,
    )
    db.add(delegation)
    db.commit()
    db.refresh(delegation)
    record_audit_log(
        db,
        user_id=current_user.id,
        action=AuditLogAction.DELEGATES_CHANGED,
        item_id=item_id,
        new_value={
            "delegation_id": delegation.id,
            "user_id": delegation.user_id,
            "group_id": delegation.group_id,
            "permission": delegation.permission,
        },
    )
    return delegation


def remove_delegation(
    item_id: int, delegation_id: int, current_user: User, db: Session
):
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only owner can remove delegates")
    delegation = (
        db.query(Delegation)
        .filter(Delegation.id == delegation_id, Delegation.item_id == item_id)
        .first()
    )
    if not delegation:
        raise HTTPException(status_code=404, detail="Delegation not found")
    old_value = {
        "delegation_id": delegation.id,
        "user_id": delegation.user_id,
        "group_id": delegation.group_id,
        "permission": delegation.permission,
    }
    db.delete(delegation)
    db.commit()
    record_audit_log(
        db,
        user_id=current_user.id,
        action=AuditLogAction.DELEGATES_CHANGED,
        item_id=item_id,
        old_value=old_value,
        new_value=None,
    )


def get_user_permission(
    item_id: int, user: User, db: Session
) -> PermissionLevel | None:
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        return None
    if item.owner_id == user.id:
        return PermissionLevel.manage
    delegation = (
        db.query(Delegation)
        .filter(
            Delegation.item_id == item_id,
            Delegation.user_id == user.id,
        )
        .first()
    )
    if delegation:
        return delegation.permission
    return None
