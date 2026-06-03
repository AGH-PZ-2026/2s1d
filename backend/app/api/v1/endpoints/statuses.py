from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.item_status import ItemStatus
from app.schemas.status import StatusResponse

router = APIRouter(prefix="/statuses", tags=["statuses"])


@router.get("/", response_model=list[StatusResponse])
def list_statuses(db: Session = Depends(get_db)):
    statuses = db.query(ItemStatus).all()
    return [
        StatusResponse(
            id=status.id,
            name=status.name,
            slug=_slugify_status(status.name),
            type="system" if status.is_system else "custom",
        )
        for status in statuses
    ]


def _slugify_status(name: str) -> str:
    replacements = {
        "ą": "a",
        "ć": "c",
        "ę": "e",
        "ł": "l",
        "ń": "n",
        "ó": "o",
        "ś": "s",
        "ź": "z",
        "ż": "z",
    }
    normalized = "".join(replacements.get(char, char) for char in name.lower())
    return "_".join(normalized.split())
