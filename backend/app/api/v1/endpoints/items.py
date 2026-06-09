from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.item import ItemCreate, ItemResponse
from app.services import item as service

router = APIRouter(prefix="/items", tags=["items"])


@router.get("/", response_model=list[ItemResponse])
def list_items(
    category_id: int | None = Query(default=None, alias="categoryId"),
    status_id: int | None = Query(default=None, alias="statusId"),
    owner_id: int | None = Query(default=None, alias="ownerId"),
    manufacturer: str | None = None,
    search: str | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    sort_by: str = Query(default="id", alias="sortBy"),
    sort_dir: str = Query(default="asc", alias="sortDir"),
    db: Session = Depends(get_db),
):
    return service.get_all(
        db,
        category_id=category_id,
        status_id=status_id,
        owner_id=owner_id,
        manufacturer=manufacturer,
        search=search,
        limit=limit,
        offset=offset,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )


@router.post("/", response_model=ItemResponse, status_code=201)
def create_item(data: ItemCreate, db: Session = Depends(get_db)):
    return service.create(db, data)


@router.get("/{item_id}", response_model=ItemResponse)
def get_item(item_id: int, db: Session = Depends(get_db)):
    return service.get_by_id(db, item_id)
