"""
Niramoy FastAPI entrypoint.

Wires CORS, routers, the WebSocket ConnectionManager singleton, and the
async DB lifecycle.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .core.config import settings
from .database import engine
from .routers import auth, hospital_admin, public, system_admin, websocket
from .services import notification_service


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown hooks."""
    # Wire the WebSocket manager so service code can broadcast events.
    notification_service.set_manager(websocket.manager)
    logger.info("Niramoy backend starting up")
    try:
        yield
    finally:
        logger.info("Niramoy backend shutting down")
        await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "Real-time ICU/NICU/CCU/HDU bed availability aggregator for "
            "hospitals in Bangladesh."
        ),
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # REST routers
    app.include_router(auth.router)
    app.include_router(public.router)
    app.include_router(hospital_admin.router)
    app.include_router(system_admin.router)

    # WebSocket
    app.include_router(websocket.router)

    @app.exception_handler(RequestValidationError)
    async def _validation_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Return a structured 422 envelope so the client can map errors
        to specific form fields.

        Shape::

            {
              "detail": "Validation failed",
              "errors": [
                {"field": "admin_email", "message": "...", "code": "..."},
                ...
              ]
            }
        """
        errors: list[dict[str, Any]] = []
        for err in exc.errors():
            raw_loc = list(err.get("loc", []))
            # Drop the leading "body" marker and the trailing "[key]" that
            # Pydantic emits for dict-key validation errors.
            cleaned = [
                str(p)
                for p in raw_loc
                if p != "body" and not (isinstance(p, str) and p == "[key]")
            ]
            field = ".".join(cleaned) if cleaned else "_root"

            raw_msg = err.get("msg", "Invalid value")
            # Pydantic prefixes model_validator messages with "Value error, ".
            msg = raw_msg.removeprefix("Value error, ")

            errors.append(
                {
                    "field": field,
                    "message": msg,
                    "code": err.get("type", "validation_error"),
                }
            )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": "Validation failed", "errors": errors},
        )

    @app.get("/ping", tags=["meta"])
    async def ping():
        return {"status": "ok", "message": "pong"}

    @app.get("/", tags=["meta"])
    async def root():
        return {
            "name": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs",
        }

    return app


app = create_app()
