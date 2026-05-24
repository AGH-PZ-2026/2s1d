from sqlalchemy import Boolean, Column, Integer, String

from app.db.session import Base


class ItemStatus(Base):
    __tablename__ = "item_status"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)
