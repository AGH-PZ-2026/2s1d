from fastapi import FastAPI

from app.api.v1.endpoints.categories import router as categories_router

app = FastAPI(title="Inventory System API")

app.include_router(categories_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Inventory System API is running"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}
