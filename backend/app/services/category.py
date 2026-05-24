from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryTree, CategoryUpdate


def get_all(db: Session) -> list[Category]:
    return db.query(Category).all()


def get_by_id(db: Session, category_id: int) -> Category:
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Kategoria nie istnieje")
    return category


def create(db: Session, data: CategoryCreate) -> Category:
    if data.parent_id is not None:
        get_by_id(db, data.parent_id)

    category = Category(name=data.name, parent_id=data.parent_id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update(db: Session, category_id: int, data: CategoryUpdate) -> Category:
    category = get_by_id(db, category_id)
    category.name = data.name
    db.commit()
    db.refresh(category)
    return category


def delete(db: Session, category_id: int) -> None:
    category = get_by_id(db, category_id)

    if category.children:
        raise HTTPException(
            status_code=400,
            detail="Nie można usunąć kategorii, która ma podkategorie",
        )

    db.delete(category)
    db.commit()


def _build_tree(category: Category) -> CategoryTree:
    return CategoryTree(
        id=category.id,
        name=category.name,
        parent_id=category.parent_id,
        children=[_build_tree(child) for child in category.children],
    )


def get_tree(db: Session) -> list[CategoryTree]:
    roots = db.query(Category).filter(Category.parent_id == None).all()  # noqa: E711
    return [_build_tree(root) for root in roots]


def _get_all_descendant_ids(category: Category) -> set[int]:
    ids = {category.id}
    for child in category.children:
        ids |= _get_all_descendant_ids(child)
    return ids


def would_create_cycle(db: Session, category_id: int, new_parent_id: int) -> bool:
    new_parent = db.query(Category).filter(Category.id == new_parent_id).first()
    if new_parent is None:
        return False
    descendants = _get_all_descendant_ids(
        db.query(Category).filter(Category.id == category_id).first()
    )
    return new_parent_id in descendants
