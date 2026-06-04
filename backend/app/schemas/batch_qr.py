from enum import Enum

from pydantic import BaseModel, Field


class QRSize(str, Enum):
    small = "small"
    medium = "medium"
    large = "large"


class QRBatchRequest(BaseModel):
    item_ids: list[int] = Field(min_length=1)
    size: QRSize = QRSize.medium
