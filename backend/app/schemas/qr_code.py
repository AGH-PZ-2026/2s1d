from pydantic import BaseModel


class QRCodeDataResponse(BaseModel):
    item_id: int
    qr_data: str


class QRItemResponse(BaseModel):
    id: int
    system_id: str | None
    name: str
    description: str | None
    qr_data: str
