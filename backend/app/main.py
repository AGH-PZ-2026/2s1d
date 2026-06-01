from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.db.session import SessionLocal
from app.services.item_status import init_system_statuses


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        init_system_statuses(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Inventory System API", lifespan=lifespan)

# Konfiguracja CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/")
async def root():
    return {"message": "Inventory System API is running"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
