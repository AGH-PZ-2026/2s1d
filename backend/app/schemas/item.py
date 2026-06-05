from pydantic import BaseModel


class ItemResponse(BaseModel):
    id: int
    name: str
    description: str | None
    location: str | None
    status_id: int | None
    owner_id: int | None
    owner_group_id: int | None

    model_config = {"from_attributes": True}
