from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import os
from typing import AsyncGenerator

# MongoDB connection
MONGODB_URL = os.getenv("DATABASE_URL", "mongodb://localhost:27017")
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "notifications_db")

# Create MongoDB client
client = AsyncIOMotorClient(MONGODB_URL)
database = client[MONGODB_DB_NAME]

async def init_db():
    """Initialize MongoDB database and create indexes."""
    try:
        # Test connection
        await client.admin.command('ping')
        print("Connected to MongoDB successfully!")
        
        # Create indexes for better performance
        await database.notifications.create_index("user_id")
        await database.notifications.create_index("created_at")
        await database.notifications.create_index([("user_id", 1), ("created_at", -1)])
        
    except Exception as e:
        print(f"MongoDB connection error: {e}")
        raise

async def get_db() -> AsyncGenerator:
    """Get MongoDB database instance."""
    yield database

async def close_db():
    """Close MongoDB connection."""
    client.close()
