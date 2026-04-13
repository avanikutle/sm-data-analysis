from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
import httpx
import logging

from config import FyersConfig

logger = logging.getLogger("fyers")
router = APIRouter()

FYERS_BASE      = "https://api-t1.fyers.in/api/v3"   # profile, positions, holdings, funds
FYERS_DATA_BASE = "https://api-t1.fyers.in/data"      # history, quotes


def resolve_auth(request: Request) -> str:
    """
    Priority:
      1. .env file  (FYERS_APP_ID + FYERS_ACCESS_TOKEN)
      2. x-fyers-auth header  (from Connectivity page UI)
    """
    FyersConfig.reload()          # pick up any token written by gen_token.py
    env_auth = FyersConfig.auth_header()
    if env_auth:
        return env_auth

    header_auth = request.headers.get("x-fyers-auth", "").strip()
    if header_auth:
        return header_auth

    raise HTTPException(
        status_code=401,
        detail="Fyers credentials not found. Set FYERS_APP_ID and FYERS_ACCESS_TOKEN in backend/.env, or run gen_token.py.",
    )


async def fyers_get(auth: str, path: str, params: dict | None = None, base: str = FYERS_BASE):
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{base}{path}",
            params=params or {},
            headers={"Authorization": auth, "Content-Type": "application/json"},
        )

    raw = resp.text
    logger.info("Fyers %s → HTTP %s | %s", path, resp.status_code, raw[:200])

    try:
        body = resp.json()
    except Exception:
        body = {"message": raw or f"HTTP {resp.status_code}"}

    if resp.status_code >= 400:
        detail = (body.get("message") or body.get("detail") or raw) if isinstance(body, dict) else raw
        raise HTTPException(status_code=resp.status_code, detail=detail or f"HTTP {resp.status_code}")

    if isinstance(body, dict) and body.get("s") == "error":
        raise HTTPException(status_code=400, detail=body.get("message", "Fyers API error"))

    return body


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/ping")
async def ping(request: Request):
    return await fyers_get(resolve_auth(request), "/profile")


@router.get("/status")
async def status():
    """Returns current .env config status without making an API call."""
    FyersConfig.reload()
    return {
        "app_id": FyersConfig.app_id or None,
        "token_set": bool(FyersConfig.access_token),
        "token_preview": (FyersConfig.access_token[:12] + "…") if FyersConfig.access_token else None,
        "source": ".env",
    }


@router.post("/reload-token")
async def reload_token():
    """Re-reads .env from disk — call this after running gen_token.py."""
    FyersConfig.reload()
    return {
        "token_set": bool(FyersConfig.access_token),
        "app_id": FyersConfig.app_id or None,
    }


@router.get("/positions")
async def positions(request: Request):
    return await fyers_get(resolve_auth(request), "/positions")


@router.get("/holdings")
async def holdings(request: Request):
    return await fyers_get(resolve_auth(request), "/holdings")


@router.get("/funds")
async def funds(request: Request):
    return await fyers_get(resolve_auth(request), "/funds")


@router.get("/quotes")
async def quotes(request: Request, symbols: str):
    return await fyers_get(resolve_auth(request), "/quotes", {"symbols": symbols}, base=FYERS_DATA_BASE)


@router.get("/history")
async def history(
    request: Request,
    symbol: str,
    resolution: str,
    date_format: int = 0,
    range_from: int = 0,
    range_to: int = 0,
    cont_flag: int = 1,
):
    return await fyers_get(resolve_auth(request), "/history", {
        "symbol": symbol,
        "resolution": resolution,
        "date_format": date_format,
        "range_from": range_from,
        "range_to": range_to,
        "cont_flag": cont_flag,
    }, base=FYERS_DATA_BASE)
