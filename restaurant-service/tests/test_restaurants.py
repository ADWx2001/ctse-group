import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_restaurant.db"
os.environ["JWT_SECRET"] = "test-secret"

from app.main import app
from app.database import Base, get_db

TEST_DB_URL = "sqlite+aiosqlite:///./test_restaurant.db"
test_engine = create_async_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


# A valid JWT generated with test-secret, role=restaurant_owner
OWNER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItMTIzIiwicm9sZSI6InJlc3RhdXJhbnRfb3duZXIiLCJleHAiOjk5OTk5OTk5OTl9.lfSehmDqt-dikdpMH-msMVEK0Ex32HkCQ9SnYTi5ypo"
CUSTOMER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItNDU2Iiwicm9sZSI6ImN1c3RvbWVyIiwiZXhwIjo5OTk5OTk5OTk5fQ.F8NhGVGlChUGJlceesjXNVYkEdTtMKBanok1fCxn-lM"


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_list_restaurants_empty(client):
    response = await client.get("/api/restaurants")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_create_restaurant_requires_auth(client):
    response = await client.post("/api/restaurants", json={
        "name": "Test Restaurant",
        "address": "123 Main St",
        "city": "Colombo"
    })
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_and_list_restaurant(client):
    response = await client.post(
        "/api/restaurants",
        json={"name": "Test Restaurant", "address": "123 Main St", "city": "Colombo", "cuisine_type": "Sri Lankan"},
        headers={"Authorization": f"Bearer {OWNER_TOKEN}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Restaurant"
    assert data["city"] == "Colombo"
    assert "id" in data

    # List should now have 1 restaurant
    list_response = await client.get("/api/restaurants")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1


@pytest.mark.asyncio
async def test_add_menu_item(client):
    # Create restaurant
    rest_resp = await client.post(
        "/api/restaurants",
        json={"name": "Burger Palace", "address": "456 Food St", "city": "Galle"},
        headers={"Authorization": f"Bearer {OWNER_TOKEN}"}
    )
    restaurant_id = rest_resp.json()["id"]

    # Add menu item
    menu_resp = await client.post(
        f"/api/menu/restaurant/{restaurant_id}",
        json={"name": "Cheese Burger", "price": 12.50, "category": "Burgers"},
        headers={"Authorization": f"Bearer {OWNER_TOKEN}"}
    )
    assert menu_resp.status_code == 201
    assert menu_resp.json()["name"] == "Cheese Burger"
    assert menu_resp.json()["price"] == 12.50
