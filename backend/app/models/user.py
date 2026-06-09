import enum

from sqlalchemy import Boolean, Column, Enum, Integer, String

from app.db.session import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=True, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.user, nullable=False)
