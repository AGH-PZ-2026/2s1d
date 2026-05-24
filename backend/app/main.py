from fastapi import FastAPI

from app.api.v1.router import api_router
from app.db.session import SessionLocal
from app.services.item_status import init_system_statuses

app = FastAPI(title="Inventory System API")

app.include_router(api_router)


@app.get("/")
async def root():
    return {"message": "Inventory System API is running"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.on_event("startup")
def startup():
    db = SessionLocal()
    try:
        init_system_statuses(db)
    finally:
        db.close()
