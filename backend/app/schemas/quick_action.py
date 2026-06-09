from pydantic import BaseModel


class QuickActionRequest(BaseModel):
    user_id: int


class ItemDetailsResponse(BaseModel):
    id: int
    name: str
    location: str
    owner_id: int
    status: str
