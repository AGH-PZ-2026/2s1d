from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True)
    system_id = Column(String(32), unique=True, index=True, nullable=True)
    name = Column(String(100), nullable=False)
    manufacturer = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    purchase_date = Column(Date, nullable=True)
    added_at = Column(DateTime(timezone=True), nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    status_id = Column(Integer, ForeignKey("item_status.id"), nullable=True)
    location = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner_group_id = Column(Integer, ForeignKey("groups.id"), nullable=True)

    category = relationship("Category", back_populates="items")
    status = relationship("ItemStatus", back_populates="items")
    owner = relationship("User")
    owner_group = relationship("Group")
