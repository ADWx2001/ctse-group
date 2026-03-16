import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
import os

os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_notifications.db"
os.environ["JWT_SECRET"] = "test-secret"

from app.main import app
from app.database import Base, get_db

TEST_DB_URL = "sqlite+aiosqlite:///./test_notifications.db"
test_engine = create_async_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db

# JWT with role=admin, user-id=admin-1 (test-secret)
ADMIN_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTEiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjk5OTk5OTk5OTl9.8XvS_7Nod_euT8SY25GDVahl4GoJADzAUsArUJvGfgk"
CUSTOMER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItNDU2Iiwicm9sZSI6ImN1c3RvbWVyIiwiZXhwIjo5OTk5OTk5OTk5fQ.F8NhGVGlChUGJlceesjXNVYkEdTtMKBanok1fCxn-lM"


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


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_send_order_confirmation(client):
    response = await client.post("/api/notifications/send", json={
        "type": "order_confirmation",
        "userId": "user-456",
        "userEmail": "test@example.com",
        "userName": "Test User",
        "orderId": "order-789",
        "restaurantName": "Test Restaurant",
        "totalAmount": 25.00,
        "items": [{"name": "Burger", "quantity": 2, "subtotal": 25.00}],
        "estimatedDeliveryTime": 30
    })
    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "order_confirmation"
    assert data["user_id"] == "user-456"
    assert "Order Confirmed" in data["title"]


@pytest.mark.asyncio
async def test_get_user_notifications(client):
    # First send a notification
    await client.post("/api/notifications/send", json={
        "type": "order_confirmation",
        "userId": "user-456",
        "orderId": "order-100",
        "restaurantName": "Pizza Place",
        "totalAmount": 15.0,
        "items": []
    })

    # Get notifications (as admin for testing)
    response = await client.get(
        "/api/notifications/user/user-456",
        headers={"Authorization": f"Bearer {ADMIN_TOKEN}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["user_id"] == "user-456"


@pytest.mark.asyncio
async def test_unauthorized_access_notifications(client):
    # Customer trying to access another user's notifications
    response = await client.get(
        "/api/notifications/user/other-user",
        headers={"Authorization": f"Bearer {CUSTOMER_TOKEN}"}
    )
    assert response.status_code == 403
