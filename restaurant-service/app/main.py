from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os

from app.database import init_db
from app.routers import restaurants, menu

UPLOAD_DIR = "static/menu-images"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[Restaurant Service] Starting up...")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    await init_db()
    logger.info("[Restaurant Service] Database initialized.")
    yield
    logger.info("[Restaurant Service] Shutting down.")


app = FastAPI(
    title="Restaurant Service",
    description="Restaurant and menu management microservice for the Food Ordering System.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "restaurant-service",
    }


os.makedirs("static/menu-images", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")
app.include_router(restaurants.router, prefix="/api/restaurants", tags=["Restaurants"])
app.include_router(menu.router, prefix="/api/menu", tags=["Menu"])
