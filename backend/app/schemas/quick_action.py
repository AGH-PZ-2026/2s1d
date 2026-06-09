from pydantic import BaseModel


class ItemDetailsResponse(BaseModel):
    id: int
    name: str
    location: str
    owner_id: int | None
    status: str
