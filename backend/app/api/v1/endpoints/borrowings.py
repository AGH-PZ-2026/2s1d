import csv
from io import BytesIO, StringIO

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response, StreamingResponse
from fpdf import FPDF
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.borrowing import (
    BorrowingRequestCreate,
    BorrowingResponse,
    BorrowingReturn,
    ExternalBorrowingCreate,
    OverdueReportRow,
)
from app.services import borrowing as service

router = APIRouter(prefix="/borrowings", tags=["borrowings"])


@router.get("/", response_model=list[BorrowingResponse])
def list_borrowings(
    item_id: int | None = Query(default=None, alias="itemId"),
    db: Session = Depends(get_db),
):
    return service.list_borrowings(db, item_id=item_id)


@router.post("/requests", response_model=BorrowingResponse, status_code=201)
def request_borrowing(
    data: BorrowingRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.request_borrowing(db, data, current_user)


@router.post("/external", response_model=BorrowingResponse, status_code=201)
def create_external_borrowing(
    data: ExternalBorrowingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.create_external_borrowing(db, data, current_user)


@router.patch("/{borrowing_id}/approve", response_model=BorrowingResponse)
def approve_borrowing(
    borrowing_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.approve_borrowing(db, borrowing_id, current_user)


@router.patch("/{borrowing_id}/reject", response_model=BorrowingResponse)
def reject_borrowing(
    borrowing_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.reject_borrowing(db, borrowing_id, current_user)


@router.patch("/{borrowing_id}/handover", response_model=BorrowingResponse)
def hand_over_borrowing(
    borrowing_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.hand_over_borrowing(db, borrowing_id, current_user)


@router.patch("/{borrowing_id}/return", response_model=BorrowingResponse)
def return_borrowing(
    borrowing_id: int,
    data: BorrowingReturn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.return_borrowing(db, borrowing_id, data, current_user)


@router.get("/overdue", response_model=list[OverdueReportRow])
def overdue_report(
    include_all: bool = Query(default=False, alias="includeAll"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_overdue_rows(db, current_user, include_all=include_all)


@router.get("/overdue.csv")
def overdue_report_csv(
    include_all: bool = Query(default=False, alias="includeAll"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = service.get_overdue_rows(db, current_user, include_all=include_all)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "borrowing_id",
            "item_id",
            "item_name",
            "owner_id",
            "borrower_id",
            "external_borrower",
            "planned_return_at",
            "days_overdue",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row.borrowing_id,
                row.item_id,
                row.item_name,
                row.owner_id,
                row.borrower_id,
                row.external_borrower,
                row.planned_return_at.isoformat(),
                row.days_overdue,
            ]
        )
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=overdue.csv"},
    )


@router.get("/overdue.pdf")
def overdue_report_pdf(
    include_all: bool = Query(default=False, alias="includeAll"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = service.get_overdue_rows(db, current_user, include_all=include_all)
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", size=14)
    pdf.cell(0, 10, "Overdue borrowings", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("helvetica", size=9)
    for row in rows:
        pdf.multi_cell(
            0,
            6,
            (
                f"#{row.borrowing_id} item #{row.item_id} {row.item_name} "
                f"borrower={row.borrower_id or row.external_borrower} "
                f"planned={row.planned_return_at.date()} "
                f"days_overdue={row.days_overdue}"
            ),
        )
    pdf_bytes = bytes(pdf.output())
    return Response(
        content=BytesIO(pdf_bytes).getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=overdue.pdf"},
    )
