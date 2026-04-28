from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


class NotificationSendRequest(BaseModel):
    """Sent by Order Service when an order event occurs."""
    type: str = Field(..., description="Notification type: order_confirmation, order_status_update")
    userId: str
    userEmail: Optional[str] = None
    userName: Optional[str] = None
    orderId: Optional[str] = None
    restaurantName: Optional[str] = None
    totalAmount: Optional[float] = None
    items: Optional[List[Any]] = None
    estimatedDeliveryTime: Optional[int] = None
    status: Optional[str] = None


class NotificationResponse(BaseModel):
    """Response model for notifications."""

    id: str
    user_id: str
    user_email: Optional[str] = None
    type: str
    title: str
    message: str
    is_read: bool
    is_email_sent: bool
    is_anouncement: bool = False
    order_id: Optional[str] = None
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None


class NotificationMarkRead(BaseModel):
    is_read: bool = True


class AdminNotificationRequest(BaseModel):
    """Sent by admin to manually create notifications."""
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    type: str = Field(..., description="Notification type")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    send_email: bool = False
    metadata: Optional[dict] = None
