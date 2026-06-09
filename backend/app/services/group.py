from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.group import Group
from app.models.user import User
from app.schemas.group import GroupCreate


def list_groups(db: Session) -> list[Group]:
    return db.query(Group).order_by(Group.name.asc()).all()


def create_group(db: Session, data: GroupCreate) -> Group:
    group = Group(name=data.name)
    db.add(group)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail="Grupa już istnieje") from exc
    db.refresh(group)
    return group


def add_member(db: Session, group_id: int, user_id: int) -> Group:
    group = _get_group(db, group_id)
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")
    if user not in group.members:
        group.members.append(user)
        db.commit()
        db.refresh(group)
    return group


def remove_member(db: Session, group_id: int, user_id: int) -> None:
    group = _get_group(db, group_id)
    user = next((member for member in group.members if member.id == user_id), None)
    if user is None:
        raise HTTPException(status_code=404, detail="Członek grupy nie istnieje")
    group.members.remove(user)
    db.commit()


def _get_group(db: Session, group_id: int) -> Group:
    group = db.query(Group).filter(Group.id == group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Grupa nie istnieje")
    return group
