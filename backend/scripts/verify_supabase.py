import asyncio
from sqlalchemy import text
from app.database import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"))
        rows = res.fetchall()
        print("TABLES_IN_SUPABASE:")
        for r in rows:
            print(" -", r[0])
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
