from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.session import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    location = Column(String, nullable=True)
    status_id = Column(Integer, ForeignKey("item_status.id"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner_group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)

    status = relationship("ItemStatus")
    owner = relationship("User")
    owner_group = relationship("Group")
