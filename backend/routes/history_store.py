"""
Storage routes: save Fyers historical candles to SQLite and query them.
This lets you accumulate data over time for offline strategy analysis.
"""
from fastapi import APIRouter, Request, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
import httpx
import time
import json

from database import get_db, Candle, StrategyRun
from routes.fyers import fyers_get, resolve_auth, FYERS_DATA_BASE

router = APIRouter()


# ── Candle storage ────────────────────────────────────────────────────────────

@router.post("/candles/fetch-and-save")
async def fetch_and_save(
    request: Request,
    symbol: str,
    resolution: str,
    range_from: int,
    range_to: int,
    db: AsyncSession = Depends(get_db),
):
    """Fetch historical candles from Fyers and persist them to the database."""
    auth = resolve_auth(request)
    data = await fyers_get(auth, "/history", {
        "symbol": symbol,
        "resolution": resolution,
        "date_format": 0,
        "range_from": range_from,
        "range_to": range_to,
        "cont_flag": 1,
    }, base=FYERS_DATA_BASE)
    candles_raw = data.get("candles", data.get("data", {}).get("candles", []))

    saved = 0
    for c in candles_raw:
        ts, o, h, l, cl, v = int(c[0]), float(c[1]), float(c[2]), float(c[3]), float(c[4]), float(c[5])
        # Upsert: delete existing then insert (sqlite has no real upsert without ON CONFLICT)
        existing = await db.execute(
            select(Candle).where(
                Candle.symbol == symbol,
                Candle.resolution == resolution,
                Candle.timestamp == ts,
            )
        )
        row = existing.scalar_one_or_none()
        if row is None:
            db.add(Candle(
                symbol=symbol, resolution=resolution, timestamp=ts,
                open=o, high=h, low=l, close=cl, volume=v, broker="fyers",
            ))
            saved += 1

    await db.commit()
    return {"saved": saved, "total_in_response": len(candles_raw), "symbol": symbol, "resolution": resolution}


@router.get("/candles")
async def get_candles(
    symbol: str,
    resolution: str,
    range_from: int = 0,
    range_to: int = 0,
    limit: int = Query(default=1000, le=10000),
    db: AsyncSession = Depends(get_db),
):
    """Query stored candles from the database."""
    stmt = (
        select(Candle)
        .where(Candle.symbol == symbol, Candle.resolution == resolution)
    )
    if range_from:
        stmt = stmt.where(Candle.timestamp >= range_from)
    if range_to:
        stmt = stmt.where(Candle.timestamp <= range_to)
    stmt = stmt.order_by(Candle.timestamp.desc()).limit(limit)

    result = await db.execute(stmt)
    rows = result.scalars().all()
    return {
        "symbol": symbol,
        "resolution": resolution,
        "count": len(rows),
        "candles": [
            {"t": r.timestamp, "o": r.open, "h": r.high, "l": r.low, "c": r.close, "v": r.volume}
            for r in reversed(rows)
        ],
    }


@router.get("/candles/available")
async def available_symbols(db: AsyncSession = Depends(get_db)):
    """List all symbol+resolution combinations stored in the database."""
    from sqlalchemy import distinct, func
    result = await db.execute(
        select(Candle.symbol, Candle.resolution, func.count(Candle.id).label("count"))
        .group_by(Candle.symbol, Candle.resolution)
        .order_by(Candle.symbol)
    )
    rows = result.all()
    return [{"symbol": r.symbol, "resolution": r.resolution, "candle_count": r.count} for r in rows]


@router.delete("/candles")
async def delete_candles(symbol: str, resolution: str, db: AsyncSession = Depends(get_db)):
    """Delete all stored candles for a symbol+resolution."""
    await db.execute(
        delete(Candle).where(Candle.symbol == symbol, Candle.resolution == resolution)
    )
    await db.commit()
    return {"deleted": True}


# ── Strategy runs ─────────────────────────────────────────────────────────────

class StrategyRunCreate(BaseModel):
    name: str
    symbol: str
    resolution: str
    from_ts: int
    to_ts: int
    params: dict = {}
    result: dict = {}


@router.post("/strategy-runs")
async def save_strategy_run(body: StrategyRunCreate, db: AsyncSession = Depends(get_db)):
    """Save a strategy backtest result."""
    run = StrategyRun(
        name=body.name,
        symbol=body.symbol,
        resolution=body.resolution,
        from_ts=body.from_ts,
        to_ts=body.to_ts,
        params_json=json.dumps(body.params),
        result_json=json.dumps(body.result),
        created_at=int(time.time()),
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return {"id": run.id}


@router.get("/strategy-runs")
async def list_strategy_runs(db: AsyncSession = Depends(get_db)):
    """List all strategy backtest runs."""
    result = await db.execute(select(StrategyRun).order_by(StrategyRun.created_at.desc()))
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "name": r.name,
            "symbol": r.symbol,
            "resolution": r.resolution,
            "from_ts": r.from_ts,
            "to_ts": r.to_ts,
            "params": json.loads(r.params_json),
            "result": json.loads(r.result_json),
            "created_at": r.created_at,
        }
        for r in rows
    ]
