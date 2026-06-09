from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ItemApiModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


class ItemCreate(ItemApiModel):
    name: str = Field(min_length=1, max_length=100)
    manufacturer: str = Field(min_length=1, max_length=100)
    description: str | None = None
    purchase_date: date | None = Field(default=None, alias="purchaseDate")
    category_id: int = Field(alias="categoryId")
    status_id: int = Field(alias="statusId")

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Nazwa przedmiotu nie może być pusta")
        return value

    @field_validator("manufacturer")
    @classmethod
    def normalize_manufacturer(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        if not stripped:
            raise ValueError("Producent nie może być pusty")
        return stripped


class ItemResponse(ItemApiModel):
    id: int
    system_id: str | None = Field(default=None, serialization_alias="systemId")
    name: str
    manufacturer: str | None = None
    description: str | None = None
    purchase_date: date | None = Field(default=None, serialization_alias="purchaseDate")
    added_at: datetime | None = Field(default=None, serialization_alias="addedAt")
    category_id: int | None = Field(default=None, serialization_alias="categoryId")
    status_id: int | None = Field(default=None, serialization_alias="statusId")
    location: str | None = None
    owner_id: int | None = None
    owner_group_id: int | None = None

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
