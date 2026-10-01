import json
from typing import Any

import redis

from app.config import settings


class MemoryStore:
    def __init__(self):
        self._data: dict[str, Any] = {}

    def set(self, key: str, value: Any, ex: int | None = None):
        self._data[key] = {"value": value, "ttl": ex}

    def get(self, key: str):
        item = self._data.get(key)
        if item is None:
            return None
        return item["value"]

    def delete(self, key: str):
        self._data.pop(key, None)

    def incr(self, key: str):
        value = self.get(key)
        new_value = int(value or 0) + 1
        self.set(key, str(new_value), ex=900)
        return new_value

    def expire(self, key: str, ttl: int):
        item = self._data.get(key)
        if item is not None:
            item["ttl"] = ttl

    def keys(self, pattern: str = "*"):
        import fnmatch
        return [k for k in self._data if fnmatch.fnmatch(k, pattern)]

    def clear(self):
        self._data.clear()


memory_store = MemoryStore()


def get_redis_client():
    if settings.REDIS_URL.startswith("memory://"):
        return memory_store
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
