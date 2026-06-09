import enum

from sqlalchemy import Boolean, Column, Enum, Float, Integer, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class LocationKind(str, enum.Enum):
    internal = "internal"
    external = "external"


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False, unique=True)
    kind = Column(Enum(LocationKind), nullable=False, default=LocationKind.internal)
    building = Column(String(80), nullable=True)
    room = Column(String(80), nullable=True)
    cabinet = Column(String(80), nullable=True)
    shelf = Column(String(80), nullable=True)
    map_x = Column(Float, nullable=True)
    map_y = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

    items = relationship("Item", back_populates="target_location")
