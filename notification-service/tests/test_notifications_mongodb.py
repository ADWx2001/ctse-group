import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from pymongo import MongoClient
import os

os.environ["DATABASE_URL"] = "mongodb://localhost:27017"
os.environ["MONGODB_DB_NAME"] = "test_notifications_db"
os.environ["JWT_SECRET"] = "test-secret"

TEST_MONGODB_URL = "mongodb://localhost:27017"
TEST_MONGODB_DB_NAME = "test_notifications_db"

async def setup_test_db():
    """Setup test database and clean it after tests."""
    client = MongoClient(TEST_MONGODB_URL)
    db = client[TEST_MONGODB_DB_NAME]
    
    # Clean up before tests
    await db.notifications.delete_many({})
    
    yield db
    
    # Clean up after tests
    client.close()

@pytest.fixture(scope="session")
async def client():
    """Create test client."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_health_check(client):
    """Test health check endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_send_order_confirmation(client):
    """Test sending order confirmation notification."""
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
    """Test getting user notifications."""
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
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTEiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjk5OTk5OTl9.8XvS_7Nod_euT8SY25GDVahl4GoJADzAUsArUJvGfgk"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert data[0]["user_id"] == "user-456"

@pytest.mark.asyncio
async def test_unauthorized_access(client):
    """Test unauthorized access to notifications."""
    response = await client.get(
        "/api/notifications/user/other-user",
        headers={"Authorization": "Bearer invalid_token"}
    )
    
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_admin_create_notification(client):
    """Test admin creating manual notification."""
    response = await client.post(
        "/api/notifications/admin/send",
        json={
            "type": "manual_announcement",
            "title": "MongoDB Test",
            "message": "Testing MongoDB integration",
            "send_email": False
        },
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTEiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjk5OTk5OTl9.8XvS_7Nod_euT8SY25GDVahl4GoJADzAUsArUJvGfgk"}
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["type"] == "manual_announcement"
    assert data["user_id"] == "system"
    assert data["title"] == "MongoDB Test"

@pytest.mark.asyncio
async def test_mark_notification_read(client):
    """Test marking notification as read."""
    # First create a notification
    create_response = await client.post(
        "/api/notifications/admin/send",
        json={
            "type": "manual_announcement",
            "title": "Test Read Notification",
            "message": "This should be marked as read",
            "send_email": False
        },
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTEiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjk5OTk5OTl9.8XvS_7Nod_euT8SY25GDVahl4GoJADzAUsArUJvGfgk"}
    )
    
    assert create_response.status_code == 201
    notification_data = create_response.json()
    
    # Mark it as read
    response = await client.put(
        f"/api/notifications/{notification_data['id']}/read",
        json={"is_read": True},
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTEiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjk5OTk5OTl9.8XvS_7Nod_euT8SY25GDVahl4GoJADzAUsArUJvGfgk"}
    )
    
    assert response.status_code == 200
    updated_data = response.json()
    assert updated_data["id"] == notification_data["id"]
    assert updated_data["is_read"] == True

@pytest.mark.asyncio
async def test_delete_notification(client):
    """Test deleting system notification."""
    # First create a system notification
    create_response = await client.post(
        "/api/notifications/admin/send",
        json={
            "type": "manual_announcement",
            "title": "Test Delete Notification",
            "message": "This should be deleted",
            "send_email": False
        },
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTEiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjk5OTk5OTl9.8XvS_7Nod_euT8SY25GDVahl4GoJADzAUsArUJvGfgk"}
    )
    
    assert create_response.status_code == 201
    notification_data = create_response.json()
    
    # Delete it
    response = await client.delete(
        f"/api/notifications/{notification_data['id']}",
        headers={"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImFkbWluLTEiLCJyb2xlIjoiYWRtaW4iLCJleHAiOjk5OTk5OTl9.8XvS_7Nod_euT8SY25GDVahl4GoJADzAUsArUJvGfgk"}
    )
    
    assert response.status_code == 204

if __name__ == "__main__":
    pytest.main([__file__])
