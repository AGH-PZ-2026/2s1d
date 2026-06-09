from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.borrowing import BorrowingMode, BorrowingStatus


class BorrowingRequestCreate(BaseModel):
    item_id: int = Field(alias="itemId")
    mode: BorrowingMode = BorrowingMode.classic
    planned_return_at: datetime | None = Field(default=None, alias="plannedReturnAt")

    model_config = ConfigDict(populate_by_name=True)


class ExternalBorrowingCreate(BaseModel):
    item_id: int = Field(alias="itemId")
    external_borrower: str = Field(alias="externalBorrower", min_length=1)
    planned_return_at: datetime | None = Field(default=None, alias="plannedReturnAt")

    model_config = ConfigDict(populate_by_name=True)


class BorrowingReturn(BaseModel):
    comment: str | None = None


class BorrowingResponse(BaseModel):
    id: int
    item_id: int = Field(serialization_alias="itemId")
    borrower_id: int | None = Field(default=None, serialization_alias="borrowerId")
    external_borrower: str | None = Field(
        default=None,
        serialization_alias="externalBorrower",
    )
    mode: BorrowingMode
    status: BorrowingStatus
    planned_return_at: datetime | None = Field(
        default=None,
        serialization_alias="plannedReturnAt",
    )
    approved_at: datetime | None = Field(default=None, serialization_alias="approvedAt")
    handed_over_at: datetime | None = Field(
        default=None,
        serialization_alias="handedOverAt",
    )
    returned_at: datetime | None = Field(default=None, serialization_alias="returnedAt")
    return_comment: str | None = Field(
        default=None, serialization_alias="returnComment"
    )
    created_at: datetime = Field(serialization_alias="createdAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class OverdueReportRow(BaseModel):
    borrowing_id: int = Field(serialization_alias="borrowingId")
    item_id: int = Field(serialization_alias="itemId")
    item_name: str = Field(serialization_alias="itemName")
    owner_id: int | None = Field(default=None, serialization_alias="ownerId")
    borrower_id: int | None = Field(default=None, serialization_alias="borrowerId")
    external_borrower: str | None = Field(
        default=None,
        serialization_alias="externalBorrower",
    )
    planned_return_at: datetime = Field(serialization_alias="plannedReturnAt")
    days_overdue: int = Field(serialization_alias="daysOverdue")
