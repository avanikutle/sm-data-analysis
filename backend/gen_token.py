"""
Fyers Access Token Generator
─────────────────────────────
Run this script once each trading day to get a fresh access token.

Usage:
    python gen_token.py

Steps performed:
  1. Reads APP_ID / SECRET / REDIRECT_URI from .env
  2. Prints the Fyers login URL
  3. You open it → log in → copy the auth_code from the redirect URL
  4. Paste the auth_code here → token is exchanged and written back to .env
"""

import os
import re
import sys
from pathlib import Path
from dotenv import load_dotenv, set_key

# ── Load .env ────────────────────────────────────────────────────────────────
ENV_PATH = Path(__file__).parent / ".env"
load_dotenv(ENV_PATH)

APP_ID       = os.getenv("FYERS_APP_ID", "").strip()
APP_SECRET   = os.getenv("FYERS_APP_SECRET", "").strip()
REDIRECT_URI = os.getenv("FYERS_REDIRECT_URI", "").strip()

if not APP_ID or not APP_SECRET:
    print("ERROR: FYERS_APP_ID and FYERS_APP_SECRET must be set in backend/.env")
    sys.exit(1)

if APP_SECRET == "YOUR_APP_SECRET_HERE":
    print("ERROR: Replace YOUR_APP_SECRET_HERE in backend/.env with your actual App Secret")
    sys.exit(1)

# ── Build auth URL ────────────────────────────────────────────────────────────
try:
    from fyers_apiv3 import fyersModel
except ImportError:
    print("ERROR: fyers-apiv3 not installed. Run: venv/Scripts/pip install fyers-apiv3")
    sys.exit(1)

session = fyersModel.SessionModel(
    client_id     = APP_ID,
    secret_key    = APP_SECRET,
    redirect_uri  = REDIRECT_URI,
    response_type = "code",
    grant_type    = "authorization_code",
)

auth_url = session.generate_authcode()

print("\n" + "="*60)
print("  STEP 1 — Open this URL in your browser and log in:")
print("="*60)
print(f"\n  {auth_url}\n")
print("  After logging in you'll be redirected to a URL like:")
print("  https://trade.fyers.in/...?auth_code=eyJ0eXAiOiJ...&state=...")
print()

# ── Get auth_code from user ───────────────────────────────────────────────────
raw = input("  Paste the full redirect URL (or just the auth_code): ").strip()

# Accept either the full URL or just the code
match = re.search(r"auth_code=([^&\s]+)", raw)
auth_code = match.group(1) if match else raw

if not auth_code:
    print("ERROR: No auth_code found.")
    sys.exit(1)

# ── Exchange for access token ─────────────────────────────────────────────────
print("\n  Exchanging auth_code for access token…")

session.set_token(auth_code)
response = session.generate_token()

if response.get("s") != "ok" or "access_token" not in response:
    print(f"\nERROR: Token generation failed:\n  {response}")
    sys.exit(1)

access_token = response["access_token"]

# ── Write back to .env ────────────────────────────────────────────────────────
set_key(str(ENV_PATH), "FYERS_ACCESS_TOKEN", access_token)

print("\n" + "="*60)
print("  SUCCESS — Access token saved to backend/.env")
print("="*60)
print(f"\n  Token (first 30 chars): {access_token[:30]}…")
print("\n  The FastAPI server will pick this up automatically.")
print("  Token is valid until midnight IST — re-run tomorrow.\n")
