from fastapi import APIRouter, Request, HTTPException
import httpx
import logging

from config import DhanConfig

logger = logging.getLogger("dhan")
router = APIRouter()

DHAN_BASE = "https://api.dhan.co/v2"


def resolve_creds(request: Request) -> tuple[str, str]:
    """
    Priority:
      1. .env file  (DHAN_CLIENT_ID + DHAN_ACCESS_TOKEN)
      2. x-dhan-token / x-dhan-client headers  (from Connectivity page UI)
    """
    DhanConfig.reload()
    if DhanConfig.is_configured():
        return DhanConfig.access_token, DhanConfig.client_id

    token     = request.headers.get("x-dhan-token", "").strip()
    client_id = request.headers.get("x-dhan-client", "").strip()
    if token and client_id:
        return token, client_id

    raise HTTPException(
        status_code=401,
        detail="Dhan credentials not found. Set DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN in backend/.env, or enter them on the Connectivity page.",
    )


async def dhan_get(token: str, client_id: str, path: str, params: dict | None = None):
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{DHAN_BASE}{path}",
            params=params or {},
            headers={
                "access-token": token,
                "client-id": client_id,
                "Content-Type": "application/json",
            },
        )

    logger.info("Dhan %s → HTTP %s", path, resp.status_code)

    if resp.status_code >= 400:
        detail = resp.text
        try:
            detail = resp.json().get("message", detail)
        except Exception:
            pass
        raise HTTPException(status_code=resp.status_code, detail=detail)

    return resp.json()


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/ping")
async def ping(request: Request):
    token, client_id = resolve_creds(request)
    return await dhan_get(token, client_id, "/fundlimit")


@router.get("/status")
async def status():
    """Returns current .env config status without making an API call."""
    DhanConfig.reload()
    return {
        "client_id": DhanConfig.client_id or None,
        "token_set": bool(DhanConfig.access_token),
        "source": ".env",
    }


@router.get("/positions")
async def positions(request: Request):
    token, client_id = resolve_creds(request)
    return await dhan_get(token, client_id, "/positions")


@router.get("/holdings")
async def holdings(request: Request):
    token, client_id = resolve_creds(request)
    return await dhan_get(token, client_id, "/holdings")


@router.get("/funds")
async def funds(request: Request):
    token, client_id = resolve_creds(request)
    return await dhan_get(token, client_id, "/fundlimit")
