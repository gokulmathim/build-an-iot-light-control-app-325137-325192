import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from .models import (
    AutomationCreate,
    AutomationOut,
    AutomationPatch,
    DeviceCreate,
    DeviceOut,
    DeviceStateUpdate,
    HealthOut,
    LoginRequest,
    ScheduleCreate,
    ScheduleOut,
    SchedulePatch,
    SignupRequest,
    TokenOut,
    UserOut,
)
from .repos import automation_repo, device_repo, schedule_repo, user_repo
from .security import create_access_token, get_current_user_from_request, get_current_user_from_ws
from .ws import WSManager

OPENAPI_TAGS = [
    {"name": "Health", "description": "Service health checks."},
    {"name": "Auth", "description": "Signup/login and identity endpoints."},
    {"name": "Devices", "description": "Register devices and control on/off + brightness."},
    {"name": "Schedules", "description": "Time-based scheduling for device actions."},
    {"name": "Automations", "description": "Rule-based automations (stub triggers)."},
    {"name": "Realtime", "description": "WebSocket realtime updates."},
]

ws_manager = WSManager()


def _cors_origins() -> List[str]:
    origins = os.getenv("CORS_ORIGINS")
    if origins:
        return [o.strip() for o in origins.split(",") if o.strip()]
    fe = os.getenv("REACT_APP_FRONTEND_URL")
    return [fe] if fe else ["*"]


async def _scheduler_loop() -> None:
    """
    Basic scheduler loop that checks schedules every 30 seconds and triggers actions.
    This is intentionally simple for template/demo purposes.
    """
    while True:
        try:
            now = datetime.now()
            await schedule_repo.run_due_schedules(now=now, on_execute=ws_manager.broadcast_device_status)
        except Exception:
            # In production we'd log; keep loop alive in this template.
            pass
        await asyncio.sleep(30)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    scheduler_task = asyncio.create_task(_scheduler_loop())
    try:
        yield
    finally:
        scheduler_task.cancel()


app = FastAPI(
    title="IoT Light Control API",
    description=(
        "FastAPI backend for IoT light control. Provides REST endpoints for auth, devices, "
        "schedules, automations, and a WebSocket at /ws for realtime device status."
    ),
    version="0.1.0",
    openapi_tags=OPENAPI_TAGS,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz", response_model=HealthOut, tags=["Health"], summary="Health check")
async def healthz() -> HealthOut:
    """
    Health check endpoint.

    Returns:
      - status: "ok"
      - time_utc: current UTC timestamp
    """
    return HealthOut(status="ok", time_utc=datetime.now(timezone.utc).isoformat())


# PUBLIC_INTERFACE
@app.post("/api/auth/signup", tags=["Auth"], summary="Create a user account", response_model=UserOut)
async def signup(payload: SignupRequest) -> UserOut:
    """
    Create a new user (email/password).

    Notes:
    - This is a template auth implementation using password hashing + JWT.
    - Firebase Auth can be integrated later by verifying Firebase ID tokens here.

    Args:
      payload: email/password

    Returns:
      The created user profile.
    """
    try:
        return user_repo.create_user(email=payload.email, password=payload.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# PUBLIC_INTERFACE
@app.post("/api/auth/login", tags=["Auth"], summary="Login and get an access token", response_model=TokenOut)
async def login(payload: LoginRequest) -> TokenOut:
    """
    Login endpoint.

    Args:
      payload: email/password

    Returns:
      JWT access token.
    """
    user = user_repo.authenticate(email=payload.email, password=payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(user_id=user["id"], email=user["email"])
    return TokenOut(access_token=token, token_type="bearer")


# PUBLIC_INTERFACE
@app.get("/api/me", tags=["Auth"], summary="Get current user profile", response_model=UserOut)
async def me(user: Dict[str, Any] = Depends(get_current_user_from_request)) -> UserOut:
    """
    Return the current authenticated user.

    Auth:
      Requires Authorization: Bearer <token>
    """
    return UserOut(id=user["id"], email=user["email"], created_at=user["created_at"])


# PUBLIC_INTERFACE
@app.get("/api/devices", tags=["Devices"], summary="List devices", response_model=List[DeviceOut])
async def list_devices(user: Dict[str, Any] = Depends(get_current_user_from_request)) -> List[DeviceOut]:
    """List devices for the current user."""
    return device_repo.list_devices(owner_user_id=user["id"])


# PUBLIC_INTERFACE
@app.post("/api/devices", tags=["Devices"], summary="Create device", response_model=DeviceOut)
async def create_device(payload: DeviceCreate, user: Dict[str, Any] = Depends(get_current_user_from_request)) -> DeviceOut:
    """Create a device record for the current user."""
    return device_repo.create_device(owner_user_id=user["id"], payload=payload)


# PUBLIC_INTERFACE
@app.delete("/api/devices/{device_id}", tags=["Devices"], summary="Delete device")
async def delete_device(device_id: str, user: Dict[str, Any] = Depends(get_current_user_from_request)) -> Dict[str, str]:
    """Delete a device owned by the current user."""
    ok = device_repo.delete_device(owner_user_id=user["id"], device_id=device_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Device not found")
    await ws_manager.broadcast_json({"type": "device_removed", "device_id": device_id})
    return {"status": "deleted"}


# PUBLIC_INTERFACE
@app.post(
    "/api/devices/{device_id}/state",
    tags=["Devices"],
    summary="Update device state",
    response_model=DeviceOut,
)
async def update_device_state(
    device_id: str,
    payload: DeviceStateUpdate,
    user: Dict[str, Any] = Depends(get_current_user_from_request),
) -> DeviceOut:
    """
    Update device state (on/off, brightness).

    In a production system, this would publish to MQTT and await device acknowledgement.
    Here we update DB state and broadcast a realtime status message.
    """
    updated = device_repo.update_state(owner_user_id=user["id"], device_id=device_id, payload=payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Device not found")
    await ws_manager.broadcast_device_status(updated)
    return updated


# PUBLIC_INTERFACE
@app.post("/api/provision", tags=["Devices"], summary="Provision/pair a device by code", response_model=DeviceOut)
async def provision_device(payload: DeviceCreate, user: Dict[str, Any] = Depends(get_current_user_from_request)) -> DeviceOut:
    """
    Provision (pair) a device.

    The frontend uses a QR/code to submit an external_id plus friendly metadata.
    """
    created = device_repo.provision_device(owner_user_id=user["id"], payload=payload)
    await ws_manager.broadcast_json({"type": "device_added", "device_id": created.id})
    return created


# PUBLIC_INTERFACE
@app.get("/api/schedules", tags=["Schedules"], summary="List schedules", response_model=List[ScheduleOut])
async def list_schedules(user: Dict[str, Any] = Depends(get_current_user_from_request)) -> List[ScheduleOut]:
    """List schedules for the current user."""
    return schedule_repo.list_schedules(owner_user_id=user["id"])


# PUBLIC_INTERFACE
@app.post("/api/schedules", tags=["Schedules"], summary="Create schedule", response_model=ScheduleOut)
async def create_schedule(payload: ScheduleCreate, user: Dict[str, Any] = Depends(get_current_user_from_request)) -> ScheduleOut:
    """Create a schedule."""
    return schedule_repo.create_schedule(owner_user_id=user["id"], payload=payload)


# PUBLIC_INTERFACE
@app.patch("/api/schedules/{schedule_id}", tags=["Schedules"], summary="Patch schedule", response_model=ScheduleOut)
async def patch_schedule(
    schedule_id: str, payload: SchedulePatch, user: Dict[str, Any] = Depends(get_current_user_from_request)
) -> ScheduleOut:
    """Update schedule fields (e.g., enabled)."""
    updated = schedule_repo.patch_schedule(owner_user_id=user["id"], schedule_id=schedule_id, payload=payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return updated


# PUBLIC_INTERFACE
@app.delete("/api/schedules/{schedule_id}", tags=["Schedules"], summary="Delete schedule")
async def delete_schedule(schedule_id: str, user: Dict[str, Any] = Depends(get_current_user_from_request)) -> Dict[str, str]:
    """Delete a schedule."""
    ok = schedule_repo.delete_schedule(owner_user_id=user["id"], schedule_id=schedule_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"status": "deleted"}


# PUBLIC_INTERFACE
@app.get("/api/automations", tags=["Automations"], summary="List automations", response_model=List[AutomationOut])
async def list_automations(user: Dict[str, Any] = Depends(get_current_user_from_request)) -> List[AutomationOut]:
    """List automations for the current user."""
    return automation_repo.list_automations(owner_user_id=user["id"])


# PUBLIC_INTERFACE
@app.post("/api/automations", tags=["Automations"], summary="Create automation", response_model=AutomationOut)
async def create_automation(
    payload: AutomationCreate, user: Dict[str, Any] = Depends(get_current_user_from_request)
) -> AutomationOut:
    """Create an automation rule."""
    return automation_repo.create_automation(owner_user_id=user["id"], payload=payload)


# PUBLIC_INTERFACE
@app.patch("/api/automations/{automation_id}", tags=["Automations"], summary="Patch automation", response_model=AutomationOut)
async def patch_automation(
    automation_id: str, payload: AutomationPatch, user: Dict[str, Any] = Depends(get_current_user_from_request)
) -> AutomationOut:
    """Update automation fields (e.g., enabled)."""
    updated = automation_repo.patch_automation(owner_user_id=user["id"], automation_id=automation_id, payload=payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Automation not found")
    return updated


# PUBLIC_INTERFACE
@app.delete("/api/automations/{automation_id}", tags=["Automations"], summary="Delete automation")
async def delete_automation(
    automation_id: str, user: Dict[str, Any] = Depends(get_current_user_from_request)
) -> Dict[str, str]:
    """Delete an automation."""
    ok = automation_repo.delete_automation(owner_user_id=user["id"], automation_id=automation_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Automation not found")
    return {"status": "deleted"}


# PUBLIC_INTERFACE
@app.get(
    "/docs/ws",
    tags=["Realtime"],
    summary="WebSocket usage",
    response_model=Dict[str, str],
)
async def ws_docs() -> Dict[str, str]:
    """
    WebSocket usage help.

    Connect to:
      - /ws?token=<JWT>

    Messages:
      - device_status: device state updates
      - device_added/device_removed: device list changes
    """
    return {
        "websocket_url": "/ws?token=<JWT>",
        "message_types": "device_status, device_added, device_removed",
    }


# PUBLIC_INTERFACE
@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """
    WebSocket endpoint for realtime device updates.

    Query params:
      - token: JWT access token (same as Authorization header)

    The server broadcasts device status updates whenever state changes, and whenever schedules execute.
    """
    user = await get_current_user_from_ws(ws)
    await ws_manager.connect(ws, user_id=user["id"])
    try:
        while True:
            # We don't require client messages; keep alive / allow pings.
            await ws.receive_text()
    except WebSocketDisconnect:
        await ws_manager.disconnect(ws)
    except Exception:
        await ws_manager.disconnect(ws)
        raise
