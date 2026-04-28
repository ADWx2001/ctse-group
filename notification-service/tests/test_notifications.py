"""
Tests for the notification service.
MongoDB is mocked so no real database connection is needed.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime
from fastapi.testclient import TestClient

from app.models import NotificationModel
from app.schemas import NotificationSendRequest, NotificationResponse, NotificationMarkRead


# ── Helpers ────────────────────────────────────────────────────────────────────

def make_jwt(user_id: str = "user123", role: str = "customer") -> str:
    from jose import jwt
    import os
    secret = os.getenv("JWT_SECRET", "change-this-secret")
    return jwt.encode({"id": user_id, "role": role}, secret, algorithm="HS256")


def make_mock_db():
    db = MagicMock()
    db.notifications = MagicMock()
    return db


class AsyncCursor:
    """Mimics a Motor cursor that supports async iteration and .sort()."""
    def __init__(self, items):
        self._items = list(items)
        self._index = 0

    def sort(self, *args, **kwargs):
        return self

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._index >= len(self._items):
            raise StopAsyncIteration
        item = self._items[self._index]
        self._index += 1
        return item


@pytest.fixture(autouse=True)
def patch_db_init():
    """Prevent the lifespan from trying to ping a real MongoDB on every test."""
    with patch("app.database.init_db", new_callable=AsyncMock), \
         patch("app.database.close_db", new_callable=AsyncMock):
        yield


# ── Model tests ────────────────────────────────────────────────────────────────

class TestNotificationModel:
    def test_create_new_generates_uuid(self):
        n = NotificationModel.create_new(
            user_id="user123",
            type="order_confirmation",
            title="Order Confirmed",
            message="Your order has been placed.",
        )
        assert n.id is not None
        assert len(n.id) == 36  # UUID format

    def test_create_new_sets_defaults(self):
        n = NotificationModel.create_new(
            user_id="user123",
            type="order_confirmation",
            title="Test",
            message="Test message",
        )
        assert n.is_read is False
        assert n.is_email_sent is False
        assert isinstance(n.created_at, datetime)

    def test_to_dict_contains_required_fields(self):
        n = NotificationModel.create_new(
            user_id="user123",
            type="order_confirmation",
            title="Test",
            message="Test message",
        )
        d = n.to_dict()
        assert d["user_id"] == "user123"
        assert d["type"] == "order_confirmation"
        assert "id" in d
        assert "created_at" in d

    def test_to_dict_excludes_none_values(self):
        n = NotificationModel.create_new(
            user_id="user123",
            type="order_confirmation",
            title="Test",
            message="Test message",
        )
        d = n.to_dict()
        assert "user_email" not in d
        assert "order_id" not in d


# ── Schema tests ───────────────────────────────────────────────────────────────

class TestSchemas:
    def test_send_request_all_fields(self):
        req = NotificationSendRequest(
            type="order_confirmation",
            userId="user123",
            userEmail="user@example.com",
            restaurantName="Spice Garden",
            totalAmount=35.00,
            estimatedDeliveryTime=30,
            orderId="order-001",
        )
        assert req.type == "order_confirmation"
        assert req.userId == "user123"
        assert req.totalAmount == 35.00

    def test_send_request_minimal(self):
        req = NotificationSendRequest(type="order_status_update", userId="user456")
        assert req.userEmail is None
        assert req.orderId is None

    def test_notification_response_valid(self):
        resp = NotificationResponse(
            id="notif-001",
            user_id="user123",
            type="order_confirmation",
            title="Order Confirmed",
            message="Your order was placed.",
            is_read=False,
            is_email_sent=True,
            created_at=datetime.utcnow(),
        )
        assert resp.id == "notif-001"
        assert resp.is_read is False
        assert resp.is_anouncement is False

    def test_mark_read_defaults_to_true(self):
        m = NotificationMarkRead()
        assert m.is_read is True

    def test_mark_read_can_be_false(self):
        m = NotificationMarkRead(is_read=False)
        assert m.is_read is False


# ── Health endpoint ────────────────────────────────────────────────────────────

class TestHealthEndpoint:
    def test_health_returns_healthy(self):
        from app.main import app
        with TestClient(app) as client:
            response = client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "healthy"
        assert body["service"] == "notification-service"


# ── POST /api/notifications/send ───────────────────────────────────────────────

class TestSendNotification:
    def _client(self, mock_db):
        from app.main import app
        from app.database import get_db
        app.dependency_overrides[get_db] = lambda: mock_db
        return app

    def test_order_confirmation_creates_notification(self):
        from app.main import app
        from app.database import get_db

        mock_db = make_mock_db()
        mock_db.notifications.insert_one = AsyncMock(return_value=MagicMock())
        app.dependency_overrides[get_db] = lambda: mock_db

        with patch("app.services.email_service.send_email", new_callable=AsyncMock, return_value=False):
            with TestClient(app) as client:
                resp = client.post("/api/notifications/send", json={
                    "type": "order_confirmation",
                    "userId": "user123",
                    "userEmail": "user@example.com",
                    "restaurantName": "Spice Garden",
                    "totalAmount": 25.50,
                    "estimatedDeliveryTime": 30,
                    "orderId": "order-001",
                    "items": [],
                })

        app.dependency_overrides.clear()
        assert resp.status_code == 201
        body = resp.json()
        assert body["user_id"] == "user123"
        assert body["type"] == "order_confirmation"
        assert "id" in body
        assert body["is_read"] is False

    def test_status_update_creates_notification(self):
        from app.main import app
        from app.database import get_db

        mock_db = make_mock_db()
        mock_db.notifications.insert_one = AsyncMock(return_value=MagicMock())
        app.dependency_overrides[get_db] = lambda: mock_db

        with patch("app.services.email_service.send_email", new_callable=AsyncMock, return_value=False):
            with TestClient(app) as client:
                resp = client.post("/api/notifications/send", json={
                    "type": "order_status_update",
                    "userId": "user123",
                    "restaurantName": "Spice Garden",
                    "status": "preparing",
                })

        app.dependency_overrides.clear()
        assert resp.status_code == 201
        assert resp.json()["type"] == "order_status_update"

    def test_unknown_type_still_creates_notification(self):
        from app.main import app
        from app.database import get_db

        mock_db = make_mock_db()
        mock_db.notifications.insert_one = AsyncMock(return_value=MagicMock())
        app.dependency_overrides[get_db] = lambda: mock_db

        with patch("app.services.email_service.send_email", new_callable=AsyncMock, return_value=False):
            with TestClient(app) as client:
                resp = client.post("/api/notifications/send", json={
                    "type": "custom_event",
                    "userId": "user123",
                })

        app.dependency_overrides.clear()
        assert resp.status_code == 201


# ── GET /api/notifications/user/{user_id} ─────────────────────────────────────

class TestGetUserNotifications:
    def test_user_gets_own_notifications(self):
        from app.main import app
        from app.database import get_db

        mock_db = make_mock_db()
        mock_db.notifications.find = MagicMock(return_value=AsyncCursor([]))
        app.dependency_overrides[get_db] = lambda: mock_db

        token = make_jwt("user123", "customer")
        with TestClient(app) as client:
            resp = client.get(
                "/api/notifications/user/user123",
                headers={"Authorization": f"Bearer {token}"},
            )

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_user_cannot_see_other_users_notifications(self):
        from app.main import app
        from app.database import get_db

        mock_db = make_mock_db()
        app.dependency_overrides[get_db] = lambda: mock_db

        token = make_jwt("user123", "customer")
        with TestClient(app) as client:
            resp = client.get(
                "/api/notifications/user/other-user-456",
                headers={"Authorization": f"Bearer {token}"},
            )

        app.dependency_overrides.clear()
        assert resp.status_code == 403

    def test_unauthenticated_request_rejected(self):
        from app.main import app
        with TestClient(app) as client:
            resp = client.get("/api/notifications/user/user123")
        assert resp.status_code in (401, 403)

    def test_restaurant_owner_can_access_any_user(self):
        from app.main import app
        from app.database import get_db

        mock_db = make_mock_db()
        mock_db.notifications.find = MagicMock(return_value=AsyncCursor([]))
        app.dependency_overrides[get_db] = lambda: mock_db

        token = make_jwt("owner456", "restaurant_owner")
        with TestClient(app) as client:
            resp = client.get(
                "/api/notifications/user/user123",
                headers={"Authorization": f"Bearer {token}"},
            )

        app.dependency_overrides.clear()
        assert resp.status_code == 200

    def test_invalid_token_rejected(self):
        from app.main import app
        with TestClient(app) as client:
            resp = client.get(
                "/api/notifications/user/user123",
                headers={"Authorization": "Bearer invalid.token.here"},
            )
        assert resp.status_code == 401


# ── PUT /api/notifications/{id}/read ──────────────────────────────────────────

class TestMarkNotificationRead:
    def test_user_can_mark_own_notification_read(self):
        from app.main import app
        from app.database import get_db

        notif_doc = {
            "id": "notif-001",
            "user_id": "user123",
            "type": "order_confirmation",
            "title": "Order Confirmed",
            "message": "Your order is ready.",
            "is_read": False,
            "is_email_sent": False,
            "is_anouncement": False,
            "created_at": datetime.utcnow(),
        }

        mock_db = make_mock_db()
        mock_db.notifications.find_one = AsyncMock(return_value=dict(notif_doc, is_read=True))
        mock_db.notifications.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        app.dependency_overrides[get_db] = lambda: mock_db

        token = make_jwt("user123", "customer")
        with TestClient(app) as client:
            resp = client.put(
                "/api/notifications/notif-001/read",
                json={"is_read": True},
                headers={"Authorization": f"Bearer {token}"},
            )

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        assert resp.json()["is_read"] is True

    def test_notification_not_found_returns_404(self):
        from app.main import app
        from app.database import get_db

        mock_db = make_mock_db()
        mock_db.notifications.find_one = AsyncMock(return_value=None)
        app.dependency_overrides[get_db] = lambda: mock_db

        token = make_jwt("user123", "customer")
        with TestClient(app) as client:
            resp = client.put(
                "/api/notifications/nonexistent/read",
                json={"is_read": True},
                headers={"Authorization": f"Bearer {token}"},
            )

        app.dependency_overrides.clear()
        assert resp.status_code == 404
