from pydantic import BaseModel

from app.models.delegation import PermissionLevel


class DelegationCreate(BaseModel):
    user_id: int | None = None
    group_id: int | None = None
    permission: PermissionLevel


class DelegationResponse(BaseModel):
    id: int
    item_id: int
    user_id: int | None
    group_id: int | None
    permission: PermissionLevel

    model_config = {"from_attributes": True}
