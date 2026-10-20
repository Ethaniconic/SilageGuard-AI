from __future__ import annotations

import socket
import sys

# Workaround for Windows Dual-Stack DNS Resolution Bug:
# When IPv6 DNS is enabled (e.g., JioFiber / dual-stack routers), getaddrinfo with AF_UNSPEC (0)
# throws socket.gaierror [Errno 11001] for IPv4-only domains (such as AWS RDS / Supabase poolers).
# This transparently falls back to socket.AF_INET if AF_UNSPEC returns Errno 11001.
if sys.platform == "win32":
    _orig_getaddrinfo = socket.getaddrinfo

    def _windows_safe_getaddrinfo(host, port, family=0, *args, **kwargs):
        try:
            return _orig_getaddrinfo(host, port, family, *args, **kwargs)
        except socket.gaierror as e:
            if family == 0 or family == getattr(socket, "AF_UNSPEC", 0):
                try:
                    return _orig_getaddrinfo(host, port, socket.AF_INET, *args, **kwargs)
                except Exception:
                    pass
            raise e

    socket.getaddrinfo = _windows_safe_getaddrinfo

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool

from app.config import settings


class Base(DeclarativeBase):
    pass


if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
        connect_args={"timeout": 8, "command_timeout": 8},
    )

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
