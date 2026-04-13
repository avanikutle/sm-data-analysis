# BrokerConnect — India Broker Dashboard

A full-stack web dashboard for Indian retail traders to monitor portfolios, analyse historical market data, and verify broker API connectivity — starting with **Fyers** and **Dhan**.

---

## Screenshots

| Summary | Data Analysis | Connectivity |
|---------|--------------|--------------|
| Positions · Holdings · Funds | OHLCV charts · Live quotes | Status cards · Test buttons |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS · Recharts |
| Backend | Python 3.12 · FastAPI · uvicorn |
| Database | SQLite via SQLAlchemy (async) · aiosqlite |
| Broker SDKs | fyers-apiv3 · httpx (Dhan REST) |
| Config | python-dotenv · backend/.env |

---

## Project Structure

```
sm-data-analysis/
├── backend/                    # FastAPI server
│   ├── main.py                 # App entry point, CORS, router mounts
│   ├── config.py               # Reads credentials from .env
│   ├── database.py             # SQLAlchemy models (Candle, StrategyRun)
│   ├── gen_token.py            # Interactive Fyers token generator
│   ├── requirements.txt
│   ├── .env.example            # Template — copy to .env and fill in
│   └── routes/
│       ├── fyers.py            # Fyers API proxy (profile, positions, history, quotes)
│       ├── dhan.py             # Dhan API proxy (positions, holdings, fundlimit)
│       └── history_store.py   # Save candles to SQLite, query stored data
│
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SummaryPage.tsx        # Portfolio overview (Fyers + Dhan)
│   │   │   ├── DataAnalysisPage.tsx   # Historical charts + live quotes
│   │   │   └── ConnectivityPage.tsx   # Broker connection status
│   │   ├── components/
│   │   │   ├── layout/  (Sidebar, Layout)
│   │   │   └── ui/      (Badge, Spinner)
│   │   ├── services/api.ts     # Axios instance, credential header injection
│   │   ├── hooks/useCredentials.ts
│   │   └── styles/globals.css
│   ├── vite.config.ts          # Proxies /api/* → localhost:8001
│   └── tailwind.config.js
│
├── package.json                # Root scripts — runs both servers concurrently
├── .gitignore
└── README.md
```

---

## Pages

### 1 · Summary
- Fetches **positions**, **holdings**, and **available funds** from both Fyers and Dhan
- Broker selector tabs (Fyers / Dhan)
- Colour-coded P&L cells (green = profit, red = loss)

### 2 · Data Analysis *(Fyers)*
- Symbol input (`NSE:SBIN-EQ`, `BSE:RELIANCE-EQ`, etc.)
- Date range pickers + resolution selector (1m · 5m · 15m · 30m · 1h · 1D · 1W · 1M)
- **Fetch** → close-price line chart + volume bar chart + scrollable OHLC table
- **Start Live** → polls Fyers quotes every 5 seconds for live price
- **Save to DB** → persists candles to SQLite for offline strategy analysis

### 3 · Connectivity
- Shows live connection status for **Fyers** and **Dhan**
- Test Connection button pings each broker's API
- Placeholder cards for Zerodha, Upstox, Angel One, ICICI Direct
- No credentials displayed on screen — all managed via `backend/.env`

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Fyers API app (`myapi.fyers.in`) and a Dhan API token (`api.dhan.co`)

### 1 · Clone the repo
```bash
git clone https://github.com/avanikutle/sm-data-analysis.git
cd sm-data-analysis
```

### 2 · Backend setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\pip install -r requirements.txt

# macOS / Linux
venv/bin/pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

```env
FYERS_APP_ID=YOUR_APP_ID-100
FYERS_APP_SECRET=YOUR_APP_SECRET
FYERS_REDIRECT_URI=https://trade.fyers.in/api-login/redirect-uri/index.html
FYERS_ACCESS_TOKEN=          # filled by gen_token.py

DHAN_CLIENT_ID=YOUR_CLIENT_ID
DHAN_ACCESS_TOKEN=YOUR_ACCESS_TOKEN
```

### 3 · Generate a Fyers access token (daily)
Fyers tokens expire at midnight IST — run this each trading day:
```bash
# Windows
venv\Scripts\python gen_token.py

# macOS / Linux
venv/bin/python gen_token.py
```
The script:
1. Prints a login URL → open it in your browser
2. You log in → copy the redirect URL
3. Paste it back → token is written to `.env` automatically

### 4 · Frontend setup
```bash
cd ../client
npm install
```

### 5 · Run both servers
From the project root:
```bash
npm install          # installs concurrently
npm run dev          # starts FastAPI (port 8001) + Vite (port 5173)
```

Or start separately:
```bash
# Terminal 1 — backend
cd backend && venv/Scripts/uvicorn main:app --port 8001 --reload

# Terminal 2 — frontend
cd client && npm run dev
```

Open **http://localhost:5173**

---

## API Endpoints (FastAPI — port 8001)

Interactive docs available at **http://localhost:8001/docs**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/fyers/ping` | Test Fyers connectivity |
| GET | `/api/fyers/positions` | Open positions |
| GET | `/api/fyers/holdings` | Long-term holdings |
| GET | `/api/fyers/funds` | Available margin / funds |
| GET | `/api/fyers/history` | Historical OHLCV candles |
| GET | `/api/fyers/quotes` | Live market quote |
| GET | `/api/fyers/status` | Token status from .env |
| POST | `/api/fyers/reload-token` | Re-read token from .env without restart |
| GET | `/api/dhan/ping` | Test Dhan connectivity |
| GET | `/api/dhan/positions` | Open positions |
| GET | `/api/dhan/holdings` | Long-term holdings |
| GET | `/api/dhan/funds` | Fund limits |
| POST | `/api/store/candles/fetch-and-save` | Fetch + persist candles to SQLite |
| GET | `/api/store/candles` | Query stored candles |
| GET | `/api/store/candles/available` | List stored symbols |
| POST | `/api/store/strategy-runs` | Save a strategy backtest result |
| GET | `/api/store/strategy-runs` | List all backtest results |

---

## Credential Flow

```
backend/.env
    │
    ▼
config.py  (FyersConfig / DhanConfig — reloaded on every request)
    │
    ▼
FastAPI route  →  httpx  →  Broker API
    │
    ▼
React frontend  (no credentials stored in browser)
```

Credentials are **never** sent to the browser. The frontend calls `/api/*` which is proxied by Vite to the FastAPI backend. The backend reads credentials from `.env` at request time.

---

## GitHub Setup (how this repo was created)

### Install GitHub CLI
```bash
winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
```

### Authenticate
```bash
gh auth login --web --git-protocol https
# Opens browser → enter the one-time code shown in the terminal
```

### Initialise git and push
```bash
git init
git add .
git commit -m "Initial commit — BrokerConnect dashboard"

gh repo create sm-dataanalasys --public --source=. --remote=origin --push
```

### Rename repository
```bash
gh repo rename sm-data-analysis --repo avanikutle/sm-dataanalasys --yes
git remote set-url origin https://github.com/avanikutle/sm-data-analysis.git
```

---

## Planned Brokers

| Broker | Status |
|--------|--------|
| Fyers | ✅ Integrated |
| Dhan | ✅ Integrated |
| Zerodha / Kite | 🔜 Planned |
| Upstox | 🔜 Planned |
| Angel One | 🔜 Planned |
| ICICI Direct | 🔜 Planned |

---

## Notes

- **Fyers token** expires daily at midnight IST — re-run `gen_token.py` each trading day
- **Dhan token** is long-lived but will expire; generate a fresh one from the Dhan API portal when it does
- The SQLite database (`backend/brokerdata.db`) is git-ignored — it stays local
- The `backend/.env` file is git-ignored — never commit real credentials

---

## License

MIT
