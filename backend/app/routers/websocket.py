"""
WebSocket router — /ws/availability endpoint + ConnectionManager.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect


logger = logging.getLogger(__name__)


router = APIRouter()


class ConnectionManager:
    """In-memory connection registry. Not horizontally scalable — fine for
    a single-process MVP. Swap for Redis pub/sub later."""

    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []
        self.hospital_groups: Dict[int, List[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
            for gid, group in list(self.hospital_groups.items()):
                if websocket in group:
                    group.remove(websocket)
                if not group:
                    self.hospital_groups.pop(gid, None)

    async def join_hospital(self, websocket: WebSocket, hospital_id: int) -> None:
        async with self._lock:
            group = self.hospital_groups.setdefault(hospital_id, [])
            if websocket not in group:
                group.append(websocket)

    async def leave_hospital(self, websocket: WebSocket, hospital_id: int) -> None:
        async with self._lock:
            group = self.hospital_groups.get(hospital_id)
            if group and websocket in group:
                group.remove(websocket)
            if group is not None and not group:
                self.hospital_groups.pop(hospital_id, None)

    async def broadcast(self, data: Dict[str, Any]) -> None:
        """Send `data` to every active connection. Per-connection failures
        drop that socket from the manager."""
        async with self._lock:
            sockets = list(self.active_connections)
        if not sockets:
            return
        message = json.dumps(data, default=str)
        for ws in sockets:
            try:
                await ws.send_text(message)
            except Exception as exc:  # noqa: BLE001
                logger.warning("broadcast send failed: %s; dropping socket", exc)
                await self.disconnect(ws)

    async def broadcast_to_hospital(
        self, hospital_id: int, data: Dict[str, Any]
    ) -> None:
        async with self._lock:
            group = list(self.hospital_groups.get(hospital_id, []))
        if not group:
            return
        message = json.dumps(data, default=str)
        for ws in group:
            try:
                await ws.send_text(message)
            except Exception as exc:  # noqa: BLE001
                logger.warning("group send failed: %s; dropping socket", exc)
                await self.disconnect(ws)


# Module-level singleton — `bed_service` and `notification_service` use this.
manager = ConnectionManager()


@router.websocket("/ws/availability")
async def availability_ws(websocket: WebSocket) -> None:
    """
    Connect, then optionally send JSON control messages:
      { "action": "join",  "hospital_id": 42 }
      { "action": "leave", "hospital_id": 42 }
    """
    await manager.connect(websocket)
    try:
        await websocket.send_json({"event": "connected", "ok": True})
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"event": "error", "detail": "invalid json"})
                continue
            action = msg.get("action")
            hospital_id = msg.get("hospital_id")
            if action == "join" and isinstance(hospital_id, int):
                await manager.join_hospital(websocket, hospital_id)
                await websocket.send_json({"event": "joined", "hospital_id": hospital_id})
            elif action == "leave" and isinstance(hospital_id, int):
                await manager.leave_hospital(websocket, hospital_id)
                await websocket.send_json({"event": "left", "hospital_id": hospital_id})
            else:
                await websocket.send_json(
                    {"event": "error", "detail": "unknown action"}
                )
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001
        logger.warning("ws error: %s", exc)
    finally:
        await manager.disconnect(websocket)