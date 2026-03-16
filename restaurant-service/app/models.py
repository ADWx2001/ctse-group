from sqlalchemy import Column, String, Float, Boolean, Integer, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import uuid


def generate_uuid():
    return str(uuid.uuid4())


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    address = Column(String(500), nullable=False)
    city = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    email = Column(String(200), nullable=True)
    cuisine_type = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    owner_id = Column(String, nullable=False)  # References User Service userId
    rating = Column(Float, default=0.0)
    image_url = Column(String(500), nullable=True)
    opening_hours = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    menu_items = relationship("MenuItem", back_populates="restaurant", cascade="all, delete-orphan")


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    restaurant_id = Column(String, ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    category = Column(String(100), nullable=True)
    is_available = Column(Boolean, default=True)
    image_url = Column(String(500), nullable=True)
    preparation_time = Column(Integer, default=15)  # minutes
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    restaurant = relationship("Restaurant", back_populates="menu_items")
