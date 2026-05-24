from __future__ import annotations

from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    parent_id: int | None = None


class CategoryUpdate(BaseModel):
    name: str


class CategoryResponse(BaseModel):
    id: int
    name: str
    parent_id: int | None

    model_config = {"from_attributes": True}


class CategoryTree(BaseModel):
    id: int
    name: str
    parent_id: int | None
    children: list[CategoryTree] = []

    model_config = {"from_attributes": True}
