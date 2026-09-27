from arq import create_pool
from redis import Redis

from app.config import settings


class WorkerSettings:
    redis_settings = settings.REDIS_URL


async def startup(ctx):
    ctx["redis"] = Redis.from_url(settings.REDIS_URL)


async def shutdown(ctx):
    await ctx["redis"].close()
