"""
Central config — reads from backend/.env via python-dotenv.
All routes import from here instead of reading os.environ directly.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")


class FyersConfig:
    app_id        = os.getenv("FYERS_APP_ID", "").strip()
    app_secret    = os.getenv("FYERS_APP_SECRET", "").strip()
    redirect_uri  = os.getenv("FYERS_REDIRECT_URI", "").strip()
    access_token  = os.getenv("FYERS_ACCESS_TOKEN", "").strip()

    @classmethod
    def auth_header(cls) -> str:
        """Returns 'APP_ID:ACCESS_TOKEN' ready for the Authorization header."""
        if cls.app_id and cls.access_token:
            return f"{cls.app_id}:{cls.access_token}"
        return ""

    @classmethod
    def is_configured(cls) -> bool:
        return bool(cls.app_id and cls.access_token)

    @classmethod
    def reload(cls):
        """Re-read .env from disk (useful after gen_token.py writes a fresh token)."""
        load_dotenv(Path(__file__).parent / ".env", override=True)
        cls.app_id       = os.getenv("FYERS_APP_ID", "").strip()
        cls.app_secret   = os.getenv("FYERS_APP_SECRET", "").strip()
        cls.redirect_uri = os.getenv("FYERS_REDIRECT_URI", "").strip()
        cls.access_token = os.getenv("FYERS_ACCESS_TOKEN", "").strip()


class DhanConfig:
    client_id    = os.getenv("DHAN_CLIENT_ID", "").strip()
    access_token = os.getenv("DHAN_ACCESS_TOKEN", "").strip()

    @classmethod
    def is_configured(cls) -> bool:
        return bool(cls.client_id and cls.access_token)

    @classmethod
    def reload(cls):
        load_dotenv(Path(__file__).parent / ".env", override=True)
        cls.client_id    = os.getenv("DHAN_CLIENT_ID", "").strip()
        cls.access_token = os.getenv("DHAN_ACCESS_TOKEN", "").strip()
