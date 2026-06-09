import enum

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.session import Base


class BorrowingMode(str, enum.Enum):
    classic = "classic"
    trusted = "trusted"
    asynchronous = "asynchronous"
    external = "external"


class BorrowingStatus(str, enum.Enum):
    pending = "pending"
    reserved = "reserved"
    borrowed = "borrowed"
    returned = "returned"
    rejected = "rejected"


class Borrowing(Base):
    __tablename__ = "borrowings"

    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("items.id"), nullable=False)
    borrower_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    external_borrower = Column(String(160), nullable=True)
    mode = Column(Enum(BorrowingMode), nullable=False)
    status = Column(
        Enum(BorrowingStatus), nullable=False, default=BorrowingStatus.pending
    )
    planned_return_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    handed_over_at = Column(DateTime(timezone=True), nullable=True)
    returned_at = Column(DateTime(timezone=True), nullable=True)
    return_comment = Column(Text, nullable=True)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    item = relationship("Item", back_populates="borrowings")
    borrower = relationship("User")
