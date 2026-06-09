from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.location import LocationKind


class LocationBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    kind: LocationKind = LocationKind.internal
    building: str | None = None
    room: str | None = None
    cabinet: str | None = None
    shelf: str | None = None
    map_x: float | None = Field(default=None, alias="mapX")
    map_y: float | None = Field(default=None, alias="mapY")
    notes: str | None = None
    is_active: bool = Field(default=True, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Nazwa lokalizacji nie może być pusta")
        return value


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    kind: LocationKind | None = None
    building: str | None = None
    room: str | None = None
    cabinet: str | None = None
    shelf: str | None = None
    map_x: float | None = Field(default=None, alias="mapX")
    map_y: float | None = Field(default=None, alias="mapY")
    notes: str | None = None
    is_active: bool | None = Field(default=None, alias="isActive")

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Nazwa lokalizacji nie może być pusta")
        return value


class LocationResponse(LocationBase):
    id: int

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
