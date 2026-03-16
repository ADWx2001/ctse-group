from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


# ─── Restaurant Schemas ───────────────────────────────────────────────────────

class RestaurantBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    address: str = Field(..., min_length=5, max_length=500)
    city: str = Field(..., min_length=2, max_length=100)
    phone: Optional[str] = None
    email: Optional[str] = None
    cuisine_type: Optional[str] = None
    image_url: Optional[str] = None
    opening_hours: Optional[str] = None


class RestaurantCreate(RestaurantBase):
    pass


class RestaurantUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    cuisine_type: Optional[str] = None
    image_url: Optional[str] = None
    opening_hours: Optional[str] = None
    is_active: Optional[bool] = None


class RestaurantResponse(RestaurantBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_active: bool
    owner_id: str
    rating: float
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RestaurantWithMenu(RestaurantResponse):
    menu_items: List["MenuItemResponse"] = []


# ─── Menu Item Schemas ─────────────────────────────────────────────────────────

class MenuItemBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    category: Optional[str] = None
    is_available: bool = True
    image_url: Optional[str] = None
    preparation_time: int = Field(default=15, ge=1)


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = None
    price: Optional[float] = Field(None, gt=0)
    category: Optional[str] = None
    is_available: Optional[bool] = None
    image_url: Optional[str] = None
    preparation_time: Optional[int] = Field(None, ge=1)


class MenuItemResponse(MenuItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    restaurant_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# Update forward reference
RestaurantWithMenu.model_rebuild()
