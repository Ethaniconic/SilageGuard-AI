import os
from typing import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

os.environ.setdefault("ENVIRONMENT", "testing")
os.environ.setdefault("TESTING", "1")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./silageguard_test.db")
os.environ.setdefault("REDIS_URL", "memory://")
os.environ.setdefault("JWT_PRIVATE_KEY_PATH", "./keys/private.pem")
os.environ.setdefault("JWT_PUBLIC_KEY_PATH", "./keys/public.pem")
os.environ.setdefault("OTP_PROVIDER", "mock")
os.environ.setdefault("OTP_PROVIDER_KEY", "test")

from app.database import Base, engine, get_db
from app.main import app, ensure_schema


@pytest.fixture
async def async_client() -> AsyncIterator[AsyncClient]:
    await ensure_schema()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
async def db_session() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(
        "sqlite+aiosqlite:///./silageguard_test.db",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.fixture(autouse=True)
async def clear_state():
    from app.redis_client import memory_store
    memory_store.clear()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield

    memory_store.clear()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
