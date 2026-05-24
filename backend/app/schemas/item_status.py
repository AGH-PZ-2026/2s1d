from pydantic import BaseModel


class ItemStatusCreate(BaseModel):
    name: str


class ItemStatusUpdate(BaseModel):
    name: str


class ItemStatusResponse(BaseModel):
    id: int
    name: str
    is_system: bool

    model_config = {"from_attributes": True}
