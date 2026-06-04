from fastapi import APIRouter, HTTPException

from app.schemas.quick_action import ItemDetailsResponse, QuickActionRequest

router = APIRouter()

# TODO: Usunąć mock po wdrożeniu modeli z #18
MOCK_ITEMS = {
    1: {
        "id": 1,
        "name": "Laptop Dell",
        "location": "Biuro 101",
        "owner_id": 10,
        "status": "active",
    },
    2: {
        "id": 2,
        "name": "Rzutnik",
        "location": "Sala Konferencyjna",
        "owner_id": 20,
        "status": "active",
    },
}
DELEGATE_USER_ID = 999


@router.get("/{item_id}", response_model=ItemDetailsResponse)
def get_item_details(item_id: int):
    """Pobiera szczegóły i docelową lokalizację przedmiotu po zeskanowaniu QR."""
    if item_id not in MOCK_ITEMS:
        raise HTTPException(status_code=404, detail="Nie znaleziono przedmiotu.")
    return MOCK_ITEMS[item_id]


@router.patch("/{item_id}/mark-damaged", response_model=ItemDetailsResponse)
def mark_item_damaged(item_id: int, request: QuickActionRequest):
    """Zmienia status przedmiotu na uszkodzony, jeśli użytkownik ma uprawnienia."""
    if item_id not in MOCK_ITEMS:
        raise HTTPException(status_code=404, detail="Nie znaleziono przedmiotu.")

    item = MOCK_ITEMS[item_id]

    if request.user_id != item["owner_id"] and request.user_id != DELEGATE_USER_ID:
        raise HTTPException(
            status_code=403, detail="Brak uprawnień do edycji tego przedmiotu."
        )

    item["status"] = "damaged"
    return item
