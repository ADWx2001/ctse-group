from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
import logging
import json

from app.database import get_db
from app.models import NotificationModel
from app.schemas import (
    NotificationSendRequest,
    NotificationResponse,
    NotificationMarkRead,
    AdminNotificationRequest,
)
from app.security import verify_token
from app.services.email_service import send_email, build_order_confirmation_email, build_status_update_email

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()


@router.post("/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def send_notification(
    data: NotificationSendRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Receive a notification event from the Order Service and:
    1. Store it in the database
    2. Attempt to send an email notification
    This endpoint is called internally by the Order Service.
    """
    # Build notification content based on type
    if data.type == "order_confirmation":
        subject, body_html = build_order_confirmation_email(data.model_dump())
        title = f"Order Confirmed — {data.restaurantName}"
        message = (
            f"Your order from {data.restaurantName} has been placed. "
            f"Total: ${data.totalAmount:.2f}. "
            f"Estimated delivery: {data.estimatedDeliveryTime} minutes."
        )
    elif data.type == "order_status_update":
        subject, body_html = build_status_update_email(data.model_dump())
        title = f"Order Status: {data.status}"
        message = f"Your order from {data.restaurantName} is now: {data.status}."
    else:
        title = f"Notification: {data.type}"
        message = f"You have a new notification."
        subject = title
        body_html = f"<p>{message}</p>"

    # Send email (non-blocking, failures logged)
    email_sent = False
    if data.userEmail:
        email_sent = await send_email(data.userEmail, subject, body_html)

    # Store notification in MongoDB
    notification = NotificationModel.create_new(
        user_id=data.userId,
        user_email=data.userEmail,
        type=data.type,
        title=title,
        message=message,
        is_email_sent=email_sent,
        order_id=data.orderId,
        metadata=data.model_dump()
    )

    # Insert into MongoDB
    result = await db.notifications.insert_one(notification.to_dict())
    
    logger.info(f"Notification stored: {notification.id} (email_sent={email_sent})")
    
    # Return the notification with ID
    return NotificationResponse(**notification.model_dump())


@router.get("/user/{user_id}", response_model=List[NotificationResponse])
async def get_user_notifications(
    user_id: str,
    unread_only: bool = False,
    db: AsyncIOMotorDatabase = Depends(get_db),
    payload: dict = Depends(verify_token)
):
    """Get all notifications for a user. Users can only view their own notifications."""
    # Check authorization
    if payload.get("role") not in ["admin", "restaurant_owner"]:
        # Regular users can only see their own notifications
        if payload["id"] != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Build query for notifications
    if user_id == "admin" and payload.get("role") in ["admin", "restaurant_owner"]:
        # For admin/restaurant owners requesting all notifications
        query = {}  # Get all notifications
    else:
        # For regular users or specific user requests
        query = {
            "$or": [
                {"user_id": user_id},
                {"user_id": "system"}
            ]
        }
    
    if unread_only:
        query["is_read"] = False

    # Execute query with sorting
    cursor = db.notifications.find(query).sort("created_at", -1)
    notifications = []
    
    async for doc in cursor:
        # Convert ObjectId to string and handle datetime
        doc["id"] = str(doc.get("id", ""))
        if "_id" in doc:
            doc.pop("_id")
        notifications.append(NotificationResponse(**doc))
    
    # Debug logging
    logger.info(f"Retrieved {len(notifications)} notifications for user {user_id} (role: {payload.get('role')})")
    for notif in notifications[:3]:  # Log first 3 notifications
        logger.info(f"  - ID: {notif.id}, user_id: {notif.user_id}, title: {notif.title}")
    
    return notifications


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    data: NotificationMarkRead,
    db: AsyncIOMotorDatabase = Depends(get_db),
    payload: dict = Depends(verify_token)
):
    """Mark a notification as read."""
    # Find the notification
    notification_doc = await db.notifications.find_one({"id": notification_id})
    
    if not notification_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    # Users can mark their own notifications as read, and any user can mark system notifications as read
    if payload.get("role") != "admin" and payload["id"] != notification_doc.get("user_id") and notification_doc.get("user_id") != "system":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Update notification
    update_result = await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"is_read": data.is_read}}
    )
    
    if update_result.modified_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    # Get updated notification
    updated_doc = await db.notifications.find_one({"id": notification_id})
    updated_doc.pop("_id")  # Remove MongoDB ObjectId
    
    return NotificationResponse(**updated_doc)


@router.post("/admin/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def admin_send_notification(
    data: AdminNotificationRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    payload: dict = Depends(verify_token)
):
    """
    Admin endpoint to manually create notifications for users.
    Only users with admin or restaurant_owner role can access this endpoint.
    """
    # Check if user is admin or restaurant owner
    if payload.get("role") not in ["admin", "restaurant_owner"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or restaurant owner access required")

    # Send email if requested and user email is provided
    email_sent = False
    if data.send_email and data.user_email:
        subject = data.title
        body_html = f"<p>{data.message}</p>"
        email_sent = await send_email(data.user_email, subject, body_html)

    # Store notification in MongoDB
    notification = NotificationModel.create_new(
        user_id=data.user_id if data.user_id else "system",
        user_email=data.user_email if data.user_email else None,
        type=data.type,
        title=data.title,
        message=data.message,
        is_email_sent=email_sent,
        is_anouncement=True,
        metadata=data.metadata
    )

    # Insert into MongoDB
    result = await db.notifications.insert_one(notification.to_dict())
    
    logger.info(f"Admin notification created: {notification.id} by admin {payload.get('id')} (email_sent={email_sent})")
    
    # Return the notification
    return NotificationResponse(**notification.model_dump())


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification(
    notification_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    payload: dict = Depends(verify_token)
):
    """Delete a notification. Only admin or restaurant owner can delete system notifications."""
    # Check if user is admin or restaurant owner
    if payload.get("role") not in ["admin", "restaurant_owner"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or restaurant owner access required")
    
    # Find the notification
    notification_doc = await db.notifications.find_one({"id": notification_id})
    
    if not notification_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    
    # Only allow deletion of system notifications (manually added)
    if notification_doc.get("user_id") != "system":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Can only delete system notifications")
    
    # Delete the notification
    delete_result = await db.notifications.delete_one({"id": notification_id})
    
    if delete_result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    
    logger.info(f"System notification deleted: {notification_id} by admin {payload.get('id')}")
    return None
