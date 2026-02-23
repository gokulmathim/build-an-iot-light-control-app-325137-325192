import json
from datetime import datetime, timezone
from typing import Any, Dict, Set, Tuple

from fastapi import WebSocket


class WSManager:
    """Tracks websocket connections per user and broadcasts events."""

    def __init__(self) -> None:
        self._connections: Set[Tuple[str, WebSocket]] = set()

    async def connect(self, ws: WebSocket, user_id: str) -> None:
        self._connections.add((user_id, ws))

    async def disconnect(self, ws: WebSocket) -> None:
        self._connections = {(uid, s) for (uid, s) in self._connections if s is not ws}

    async def broadcast_json(self, msg: Dict[str, Any]) -> None:
        data = json.dumps(msg)
        dead = []
        for _, ws in list(self._connections):
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)

    async def broadcast_device_status(self, device: Any) -> None:
        # device can be a pydantic model or dict-like
        payload = device.model_dump() if hasattr(device, "model_dump") else dict(device)
        await self.broadcast_json(
            {
                "type": "device_status",
                "device_id": payload.get("id"),
                "online": payload.get("online"),
                "is_on": payload.get("is_on"),
                "brightness": payload.get("brightness"),
                "ts": datetime.now(timezone.utc).isoformat(),
            }
        )
