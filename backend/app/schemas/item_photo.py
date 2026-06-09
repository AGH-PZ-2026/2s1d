from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ItemPhotoResponse(BaseModel):
    id: int
    item_id: int = Field(serialization_alias="itemId")
    uploaded_by_id: int = Field(serialization_alias="uploadedById")
    original_filename: str = Field(serialization_alias="originalFilename")
    content_type: str = Field(serialization_alias="contentType")
    storage_path: str = Field(serialization_alias="storagePath")
    added_at: datetime = Field(serialization_alias="addedAt")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
