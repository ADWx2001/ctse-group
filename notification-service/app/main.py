from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.database import init_db, close_db
from app.routers import notifications

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    logger.info("[Notification Service] Starting up...")
    await init_db()
    logger.info("[Notification Service] MongoDB initialized.")
    yield
    logger.info("[Notification Service] Shutting down...")
    await close_db()
    logger.info("[Notification Service] MongoDB connection closed.")


app = FastAPI(
    title="Notification Service",
    description="Email and push notification microservice for the Food Ordering System. "
                "Receives events from Order Service and sends notifications to users.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "notification-service",
    }


app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
