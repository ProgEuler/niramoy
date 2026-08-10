"""
Pytest fixtures for the backend test suite.

The suite runs against an in-memory SQLite database (via aiosqlite) so it
does not require a running Postgres instance. Each test gets a freshly
built engine, schema, and an httpx AsyncClient that drives the FastAPI
app in-process via ASGITransport + LifespanManager.

We swap the module-level ``app.database.engine`` / ``AsyncSessionLocal``
for every test because the production code reaches for them via
module-level imports (e.g. in ``app.seed``) and via the ``get_db``
dependency.
"""

from __future__ import annotations

from typing import AsyncGenerator

import pytest_asyncio  # noqa: F401  (fixture decorators)
from asgi_lifespan import LifespanManager
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app import database as app_database
from app.core.security import hash_password
from app.database import Base
from app.main import create_app
from app.models import User, UserRole


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture()
async def engine():
    """Fresh in-memory SQLite engine per test, with schema created."""
    test_engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        # The default async SQLite pool gives us a single in-memory
        # connection shared across sessions, so data created via the
        # test client is visible to assertions.
        poolclass=None,
    )

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Patch the module-level references that other code imports.
    app_database.engine = test_engine
    app_database.AsyncSessionLocal = async_sessionmaker(
        bind=test_engine,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
        class_=AsyncSession,
    )

    yield test_engine

    await test_engine.dispose()


@pytest_asyncio.fixture()
async def db_session(engine) -> AsyncGenerator[AsyncSession, None]:
    """Yield a fresh AsyncSession for assertions."""
    async with app_database.AsyncSessionLocal() as session:
        yield session


@pytest_asyncio.fixture()
async def app(engine):
    """Build the FastAPI app bound to the test engine."""
    return create_app()


@pytest_asyncio.fixture()
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    """An httpx AsyncClient that drives the FastAPI app in-process."""
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            yield c


# ── Helpers ────────────────────────────────────────────────────────────


async def insert_user(
    db: AsyncSession,
    *,
    email: str,
    username: str,
    password: str = "ExistingPass123!",
    role: UserRole = UserRole.patient,
    hospital_id: int | None = None,
) -> User:
    """Insert a user directly via the ORM for duplicate-scenario tests."""
    user = User(
        username=username,
        email=email,
        password_hash=hash_password(password),
        role=role,
        hospital_id=hospital_id,
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
