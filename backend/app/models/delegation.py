import enum

from sqlalchemy import Column, Enum, ForeignKey, Integer
from sqlalchemy.orm import relationship

from app.db.session import Base


class PermissionLevel(str, enum.Enum):
    manage = "manage"
    edit = "edit"


class Delegation(Base):
    __tablename__ = "delegations"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)
    permission = Column(Enum(PermissionLevel), nullable=False)

    item = relationship("Item")
    user = relationship("User")
    group = relationship("Group")
