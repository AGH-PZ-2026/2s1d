from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.borrowing import Borrowing, BorrowingMode, BorrowingStatus
from app.models.item import Item
from app.models.item_status import ItemStatus
from app.models.user import User, UserRole
from app.schemas.audit_log import AuditLogAction
from app.schemas.borrowing import (
    BorrowingRequestCreate,
    BorrowingReturn,
    ExternalBorrowingCreate,
    OverdueReportRow,
)
from app.services.audit_log import record_audit_log

STATUS_PENDING = "Oczekuje zatwierdzenia"
STATUS_RESERVED = "Zarezerwowany"
STATUS_BORROWED = "Wypożyczony"
STATUS_AVAILABLE = "Dostępny"


def list_borrowings(db: Session, item_id: int | None = None) -> list[Borrowing]:
    query = db.query(Borrowing).order_by(Borrowing.created_at.desc())
    if item_id is not None:
        query = query.filter(Borrowing.item_id == item_id)
    return query.all()


def request_borrowing(
    db: Session,
    data: BorrowingRequestCreate,
    current_user: User,
) -> Borrowing:
    if data.mode == BorrowingMode.external:
        raise HTTPException(
            status_code=422,
            detail="Wypożyczenie zewnętrzne tworzy właściciel osobnym endpointem",
        )
    item = _get_item(db, data.item_id)
    _ensure_no_active_borrowing(db, item.id)

    borrowing = Borrowing(
        item_id=item.id,
        borrower_id=current_user.id,
        mode=data.mode,
        status=BorrowingStatus.pending,
        planned_return_at=data.planned_return_at,
    )
    db.add(borrowing)
    _set_item_status(db, item, STATUS_PENDING)
    db.commit()
    db.refresh(borrowing)
    record_audit_log(
        db,
        user_id=current_user.id,
        action=AuditLogAction.BORROWING_REQUESTED,
        item_id=item.id,
        new_value={
            "borrowing_id": borrowing.id,
            "mode": borrowing.mode,
            "status": borrowing.status,
            "planned_return_at": _iso(borrowing.planned_return_at),
        },
    )
    return borrowing


def approve_borrowing(db: Session, borrowing_id: int, current_user: User) -> Borrowing:
    borrowing = _get_borrowing(db, borrowing_id)
    _ensure_owner_or_admin(borrowing.item, current_user)
    _ensure_status(borrowing, BorrowingStatus.pending)

    borrowing.status = BorrowingStatus.reserved
    borrowing.approved_at = datetime.now(UTC)
    _set_item_status(db, borrowing.item, STATUS_RESERVED)
    db.commit()
    db.refresh(borrowing)
    record_audit_log(
        db,
        user_id=current_user.id,
        action=AuditLogAction.BORROWING_APPROVED,
        item_id=borrowing.item_id,
        old_value={"status": BorrowingStatus.pending},
        new_value={"status": borrowing.status, "borrowing_id": borrowing.id},
    )
    return borrowing


def reject_borrowing(db: Session, borrowing_id: int, current_user: User) -> Borrowing:
    borrowing = _get_borrowing(db, borrowing_id)
    _ensure_owner_or_admin(borrowing.item, current_user)
    _ensure_status(borrowing, BorrowingStatus.pending)

    borrowing.status = BorrowingStatus.rejected
    _set_item_status(db, borrowing.item, STATUS_AVAILABLE)
    db.commit()
    db.refresh(borrowing)
    record_audit_log(
        db,
        user_id=current_user.id,
        action=AuditLogAction.ITEM_UPDATED,
        item_id=borrowing.item_id,
        old_value={"borrowing_status": BorrowingStatus.pending},
        new_value={
            "borrowing_status": borrowing.status,
            "borrowing_id": borrowing.id,
        },
    )
    return borrowing


def hand_over_borrowing(
    db: Session, borrowing_id: int, current_user: User
) -> Borrowing:
    borrowing = _get_borrowing(db, borrowing_id)
    _ensure_status(borrowing, BorrowingStatus.reserved)
    if borrowing.mode == BorrowingMode.asynchronous:
        _ensure_borrower(borrowing, current_user)
    else:
        _ensure_owner_or_admin(borrowing.item, current_user)

    borrowing.status = BorrowingStatus.borrowed
    borrowing.handed_over_at = datetime.now(UTC)
    _set_item_status(db, borrowing.item, STATUS_BORROWED)
    db.commit()
    db.refresh(borrowing)
    record_audit_log(
        db,
        user_id=current_user.id,
        action=AuditLogAction.ITEM_BORROWED,
        item_id=borrowing.item_id,
        old_value={"status": BorrowingStatus.reserved},
        new_value={"status": borrowing.status, "borrowing_id": borrowing.id},
    )
    return borrowing


def return_borrowing(
    db: Session,
    borrowing_id: int,
    data: BorrowingReturn,
    current_user: User,
) -> Borrowing:
    borrowing = _get_borrowing(db, borrowing_id)
    _ensure_status(borrowing, BorrowingStatus.borrowed)
    if borrowing.mode in {BorrowingMode.trusted, BorrowingMode.asynchronous}:
        _ensure_borrower(borrowing, current_user)
    else:
        _ensure_owner_or_admin(borrowing.item, current_user)

    borrowing.status = BorrowingStatus.returned
    borrowing.returned_at = datetime.now(UTC)
    borrowing.return_comment = data.comment
    _set_item_status(db, borrowing.item, STATUS_AVAILABLE)
    db.commit()
    db.refresh(borrowing)
    record_audit_log(
        db,
        user_id=current_user.id,
        action=AuditLogAction.BORROWING_RETURNED,
        item_id=borrowing.item_id,
        old_value={"status": BorrowingStatus.borrowed},
        new_value={
            "status": borrowing.status,
            "borrowing_id": borrowing.id,
            "comment": borrowing.return_comment,
        },
    )
    return borrowing


def create_external_borrowing(
    db: Session,
    data: ExternalBorrowingCreate,
    current_user: User,
) -> Borrowing:
    item = _get_item(db, data.item_id)
    _ensure_owner_or_admin(item, current_user)
    _ensure_no_active_borrowing(db, item.id)

    borrowing = Borrowing(
        item_id=item.id,
        external_borrower=data.external_borrower.strip(),
        mode=BorrowingMode.external,
        status=BorrowingStatus.borrowed,
        planned_return_at=data.planned_return_at,
        approved_at=datetime.now(UTC),
        handed_over_at=datetime.now(UTC),
    )
    db.add(borrowing)
    _set_item_status(db, item, STATUS_BORROWED)
    db.commit()
    db.refresh(borrowing)
    record_audit_log(
        db,
        user_id=current_user.id,
        action=AuditLogAction.ITEM_BORROWED,
        item_id=item.id,
        new_value={
            "borrowing_id": borrowing.id,
            "mode": borrowing.mode,
            "status": borrowing.status,
            "external_borrower": borrowing.external_borrower,
        },
    )
    return borrowing


def get_overdue_rows(
    db: Session,
    current_user: User,
    include_all: bool = False,
) -> list[OverdueReportRow]:
    if include_all and current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=403,
            detail="Tylko administrator widzi całość",
        )

    now = datetime.now(UTC)
    query = (
        db.query(Borrowing)
        .join(Item)
        .filter(
            Borrowing.status == BorrowingStatus.borrowed,
            Borrowing.planned_return_at.is_not(None),
            Borrowing.planned_return_at < now,
        )
    )
    if not include_all:
        query = query.filter(Item.owner_id == current_user.id)

    rows = []
    for borrowing in query.order_by(Borrowing.planned_return_at.asc()).all():
        planned = borrowing.planned_return_at
        if planned.tzinfo is None:
            planned = planned.replace(tzinfo=UTC)
        rows.append(
            OverdueReportRow(
                borrowing_id=borrowing.id,
                item_id=borrowing.item_id,
                item_name=borrowing.item.name,
                owner_id=borrowing.item.owner_id,
                borrower_id=borrowing.borrower_id,
                external_borrower=borrowing.external_borrower,
                planned_return_at=planned,
                days_overdue=max((now - planned).days, 0),
            )
        )
    return rows


def _get_item(db: Session, item_id: int) -> Item:
    item = db.query(Item).filter(Item.id == item_id).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Przedmiot nie istnieje")
    return item


def _get_borrowing(db: Session, borrowing_id: int) -> Borrowing:
    borrowing = db.query(Borrowing).filter(Borrowing.id == borrowing_id).first()
    if borrowing is None:
        raise HTTPException(status_code=404, detail="Wypożyczenie nie istnieje")
    return borrowing


def _ensure_no_active_borrowing(db: Session, item_id: int) -> None:
    active = (
        db.query(Borrowing)
        .filter(
            Borrowing.item_id == item_id,
            Borrowing.status.in_(
                [
                    BorrowingStatus.pending,
                    BorrowingStatus.reserved,
                    BorrowingStatus.borrowed,
                ]
            ),
        )
        .first()
    )
    if active is not None:
        raise HTTPException(
            status_code=409,
            detail="Przedmiot jest już w obiegu",
        )


def _ensure_owner_or_admin(item: Item, user: User) -> None:
    if user.role == UserRole.admin:
        return
    if item.owner_id != user.id:
        raise HTTPException(
            status_code=403, detail="Tylko właściciel może wykonać akcję"
        )


def _ensure_borrower(borrowing: Borrowing, user: User) -> None:
    if borrowing.borrower_id != user.id:
        raise HTTPException(
            status_code=403, detail="Tylko wypożyczający może wykonać akcję"
        )


def _ensure_status(borrowing: Borrowing, expected: BorrowingStatus) -> None:
    if borrowing.status != expected:
        raise HTTPException(status_code=409, detail="Niepoprawny status wypożyczenia")


def _set_item_status(db: Session, item: Item, name: str) -> None:
    status = db.query(ItemStatus).filter(ItemStatus.name == name).first()
    if status is None:
        raise HTTPException(status_code=409, detail=f"Brak statusu {name}")
    item.status_id = status.id


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None
