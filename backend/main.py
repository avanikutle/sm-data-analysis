from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO, format="%(name)s | %(levelname)s | %(message)s")

from database import init_db
from routes import fyers, dhan, history_store

app = FastAPI(title="BrokerConnection API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fyers.router, prefix="/api/fyers", tags=["Fyers"])
app.include_router(dhan.router, prefix="/api/dhan", tags=["Dhan"])
app.include_router(history_store.router, prefix="/api/store", tags=["Storage"])


@app.on_event("startup")
async def startup():
    await init_db()


@app.get("/api/health")
async def health():
    return {"status": "ok"}
