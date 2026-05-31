from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.schemas.audit_log import AuditLogResponse
from app.services.audit_log import get_audit_logs

from app.db.session import get_db 

router = APIRouter()

@router.get("/", response_model=List[AuditLogResponse])
def read_audit_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    logs = get_audit_logs(db, skip=skip, limit=limit)
    return logs