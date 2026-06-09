from sqlalchemy import Boolean, Column, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.db.session import Base


class ItemStatus(Base):
    __tablename__ = "item_status"

    __table_args__ = (UniqueConstraint("name", name="unique_item_status_name"),)

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)

    items = relationship("Item", back_populates="status")
