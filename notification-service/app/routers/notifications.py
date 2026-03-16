from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import json
import logging

from app.database import get_db
from app.models import Notification
from app.schemas import NotificationSendRequest, NotificationResponse, NotificationMarkRead
from app.security import verify_token
from app.services.email_service import (
    send_email,
    build_order_confirmation_email,
    build_status_update_email
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def send_notification(
    data: NotificationSendRequest,
    db: AsyncSession = Depends(get_db)
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

    # Store notification
    notification = Notification(
        user_id=data.userId,
        user_email=data.userEmail,
        type=data.type,
        title=title,
        message=message,
        is_email_sent=email_sent,
        order_id=data.orderId,
        metadata_json=json.dumps(data.model_dump(), default=str)
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)

    logger.info(f"Notification stored: {notification.id} (email_sent={email_sent})")
    return notification


@router.get("/user/{user_id}", response_model=List[NotificationResponse])
async def get_user_notifications(
    user_id: str,
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token)
):
    """Get all notifications for a user. Users can only view their own notifications."""
    # Users can only see their own; admin can see any
    if payload.get("role") != "admin" and payload["id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    query = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc())

    result = await db.execute(query)
    return result.scalars().all()


@router.put("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: str,
    data: NotificationMarkRead,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(verify_token)
):
    """Mark a notification as read."""
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    if payload.get("role") != "admin" and payload["id"] != notification.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    notification.is_read = data.is_read
    await db.commit()
    await db.refresh(notification)
    return notification
