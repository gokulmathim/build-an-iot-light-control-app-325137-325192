# IoT Light Control App (React + FastAPI)

Monorepo containing:
- **React SPA** (port 3000) with auth, device management, schedules/automations, and real-time updates
- **FastAPI backend** (port 8000) with REST + WebSocket and a simple JWT auth model
- **PostgreSQL schema** (SQL file) for core entities

## Prerequisites
- Node.js 18+
- Python 3.11+
- (Optional) PostgreSQL if you want persistence beyond SQLite fallback

## Environment variables
This repo expects the existing `.env` (already provided in this workspace) for frontend base URLs:

- `REACT_APP_API_BASE`
- `REACT_APP_BACKEND_URL`
- `REACT_APP_FRONTEND_URL`
- `REACT_APP_WS_URL`

Backend configuration is via environment variables (do not hardcode secrets):
- `DATABASE_URL` (optional; if not set backend uses local SQLite file)
- `JWT_SECRET` (recommended; if not set backend uses a dev default)
- `CORS_ORIGINS` (optional; defaults to `REACT_APP_FRONTEND_URL`)

## Run (dev)

### 1) Backend
```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API docs: http://localhost:8000/docs

### 2) Frontend
```bash
cd frontend
npm install
npm start
```

App: http://localhost:3000

## Notes / Scope
- Auth is implemented as **email+password** with JWT tokens (kept in `localStorage`).
- Real-time device status updates are delivered via WebSocket at `/ws`.
- MQTT integration is represented in code as a **stub interface** (so you can later wire mosquitto without changing the UI contracts).
- Database schema is provided in `db/schema.sql`. The backend can run with SQLite fallback for local dev.

Task completed: full-stack scaffold + core UI/API for IoT light control.
