from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User, UserRole
from app.schemas.user import MockSsoLogin, UserCreate, UserRoleUpdate


def register_user(data: UserCreate, db: Session):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        is_active=False,
        is_approved=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def login_user(email: str, password: str, db: Session):
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    if not user.is_active or not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Konto wymaga zatwierdzenia przez administratora",
        )
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


def mock_sso_login(data: MockSsoLogin, db: Session):
    user = db.query(User).filter(User.email == data.email).first()
    if user is None:
        user = User(
            email=data.email,
            hashed_password=get_password_hash("mock-sso-authentication"),
        )
        db.add(user)
    user.role = data.role
    user.is_active = True
    user.is_approved = True
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer", "user": user}


def approve_user(user_id: int, current_user: User, db: Session) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Tylko administrator")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")
    user.is_active = True
    user.is_approved = True
    db.commit()
    db.refresh(user)
    return user


def update_user_role(
    user_id: int,
    data: UserRoleUpdate,
    current_user: User,
    db: Session,
) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Tylko administrator")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Użytkownik nie istnieje")
    user.role = data.role
    db.commit()
    db.refresh(user)
    return user


def list_approved_users(db: Session) -> list[User]:
    return (
        db.query(User)
        .filter(User.is_active == True, User.is_approved == True)  # noqa: E712
        .order_by(User.email.asc())
        .all()
    )
