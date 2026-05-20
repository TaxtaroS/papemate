import os

from motor.motor_asyncio import AsyncIOMotorClient


MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "papermate")

client = AsyncIOMotorClient(MONGO_URL)
db = client[MONGO_DB_NAME]


async def ensure_indexes():
    await db.users.create_index("username", unique=True)
