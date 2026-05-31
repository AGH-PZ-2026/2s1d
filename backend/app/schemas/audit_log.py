import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict

class AuditLogBase(BaseModel):
    user_id: int
    action: str
    item_id: int
    old_value: dict[str, Any] | None = None
    new_value: dict[str, Any] | None = None

class AuditLogCreate(AuditLogBase):
    pass

class AuditLogResponse(AuditLogBase):
    id: int
    timestamp: datetime.datetime
    model_config = ConfigDict(from_attributes=True)