from datetime import datetime
from typing import Optional, Dict, Any
import uuid
from pydantic import BaseModel
from bson import ObjectId


def generate_uuid():
    return str(uuid.uuid4())


class NotificationModel(BaseModel):
    """MongoDB notification model."""
    id: str
    user_id: str
    user_email: Optional[str] = None
    type: str  # order_confirmation, order_status_update, etc.
    title: str
    message: str
    is_read: bool = False
    is_anouncement: bool = False
    is_email_sent: bool = False
    order_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        json_encoders = {
            ObjectId: str
        }

    @classmethod
    def create_new(cls, **kwargs):
        """Create a new notification with generated ID and timestamp."""
        notification_data = {
            "id": generate_uuid(),
            "created_at": datetime.utcnow(),
            **kwargs
        }
        return cls(**notification_data)

    def to_dict(self) -> Dict[str, Any]:
        """Convert model to dictionary for MongoDB storage."""
        return self.model_dump(exclude_none=True)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "NotificationModel":
        """Create model from MongoDB document."""
        if "created_at" in data and isinstance(data["created_at"], datetime):
            # Keep datetime as is
            pass
        return cls(**data)
