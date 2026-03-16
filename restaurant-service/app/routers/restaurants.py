from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models import Restaurant
from app.schemas import RestaurantCreate, RestaurantUpdate, RestaurantResponse, RestaurantWithMenu
from app.security import verify_token, require_owner_or_admin

router = APIRouter()


@router.get("", response_model=List[RestaurantResponse])
async def list_restaurants(
    city: str = None,
    cuisine_type: str = None,
    db: AsyncSession = Depends(get_db)
):
    """List all active restaurants, with optional filter by city or cuisine type."""
    query = select(Restaurant).where(Restaurant.is_active == True)

    if city:
        query = query.where(Restaurant.city.ilike(f"%{city}%"))
    if cuisine_type:
        query = query.where(Restaurant.cuisine_type.ilike(f"%{cuisine_type}%"))

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{restaurant_id}", response_model=RestaurantWithMenu)
async def get_restaurant(restaurant_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single restaurant with its full menu."""
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Restaurant)
        .options(selectinload(Restaurant.menu_items))
        .where(Restaurant.id == restaurant_id)
    )
    restaurant = result.scalar_one_or_none()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
    return restaurant


@router.post("", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED)
async def create_restaurant(
    data: RestaurantCreate,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_owner_or_admin)
):
    """Create a new restaurant (restaurant_owner or admin only)."""
    restaurant = Restaurant(**data.model_dump(), owner_id=payload["id"])
    db.add(restaurant)
    await db.commit()
    await db.refresh(restaurant)
    return restaurant


@router.put("/{restaurant_id}", response_model=RestaurantResponse)
async def update_restaurant(
    restaurant_id: str,
    data: RestaurantUpdate,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_owner_or_admin)
):
    """Update a restaurant (only the owner or admin can update)."""
    result = await db.execute(select(Restaurant).where(Restaurant.id == restaurant_id))
    restaurant = result.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")

    # Owners can only update their own restaurant
    if payload.get("role") != "admin" and restaurant.owner_id != payload["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this restaurant")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(restaurant, field, value)

    await db.commit()
    await db.refresh(restaurant)
    return restaurant


@router.delete("/{restaurant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_restaurant(
    restaurant_id: str,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_owner_or_admin)
):
    """Soft-delete a restaurant by deactivating it."""
    result = await db.execute(select(Restaurant).where(Restaurant.id == restaurant_id))
    restaurant = result.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")

    if payload.get("role") != "admin" and restaurant.owner_id != payload["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this restaurant")

    restaurant.is_active = False
    await db.commit()
