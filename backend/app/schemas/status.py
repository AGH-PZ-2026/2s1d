from pydantic import BaseModel


class StatusResponse(BaseModel):
    id: int
    name: str
    slug: str
    type: str
    description: str | None = None
