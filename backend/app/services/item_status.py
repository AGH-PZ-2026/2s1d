from sqlalchemy.orm import Session

from app.models.item_status import ItemStatus

SYSTEM_STATUS = [
    "Dostępny",
    "Wypożyczony",
    "Zarezerwowany",
    "Uszkodzony",
    "Oczekuje zatwierdzenia",
]


def init_system_statuses(db: Session):
    for name in SYSTEM_STATUS:
        exists = db.query(ItemStatus).filter(ItemStatus.name == name).first()
        if not exists:
            db.add(ItemStatus(name=name, is_system=True))
    db.commit()
