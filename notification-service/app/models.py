from sqlalchemy import Column, String, Boolean, Text, DateTime
from sqlalchemy.sql import func
from app.database import Base
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, nullable=False, index=True)
    user_email = Column(String(200), nullable=True)
    type = Column(String(50), nullable=False)  # order_confirmation, order_status_update, etc.
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    is_email_sent = Column(Boolean, default=False)
    order_id = Column(String, nullable=True)
    metadata_json = Column(Text, nullable=True)  # Additional data as JSON
    created_at = Column(DateTime(timezone=True), server_default=func.now())
