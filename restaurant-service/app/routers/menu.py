from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models import MenuItem, Restaurant
from app.schemas import MenuItemCreate, MenuItemUpdate, MenuItemResponse
from app.security import require_owner_or_admin, verify_token

router = APIRouter()


@router.get("/restaurant/{restaurant_id}", response_model=List[MenuItemResponse])
async def get_menu(restaurant_id: str, db: AsyncSession = Depends(get_db)):
    """Get all available menu items for a restaurant (public endpoint)."""
    result = await db.execute(
        select(MenuItem)
        .where(MenuItem.restaurant_id == restaurant_id, MenuItem.is_available == True)
    )
    return result.scalars().all()


@router.get("/{item_id}", response_model=MenuItemResponse)
async def get_menu_item(item_id: str, db: AsyncSession = Depends(get_db)):
    """Get a single menu item by ID. Used internally by Order Service."""
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    return item


@router.post("/restaurant/{restaurant_id}", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
async def add_menu_item(
    restaurant_id: str,
    data: MenuItemCreate,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_owner_or_admin)
):
    """Add a menu item to a restaurant (owner/admin only)."""
    result = await db.execute(select(Restaurant).where(Restaurant.id == restaurant_id))
    restaurant = result.scalar_one_or_none()

    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")

    if payload.get("role") != "admin" and restaurant.owner_id != payload["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this restaurant")

    item = MenuItem(**data.model_dump(), restaurant_id=restaurant_id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.put("/{item_id}", response_model=MenuItemResponse)
async def update_menu_item(
    item_id: str,
    data: MenuItemUpdate,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_owner_or_admin)
):
    """Update a menu item (owner/admin only)."""
    result = await db.execute(
        select(MenuItem).join(Restaurant).where(MenuItem.id == item_id)
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")

    # Verify ownership
    rest_result = await db.execute(select(Restaurant).where(Restaurant.id == item.restaurant_id))
    restaurant = rest_result.scalar_one_or_none()
    if payload.get("role") != "admin" and restaurant.owner_id != payload["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this restaurant")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_item(
    item_id: str,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(require_owner_or_admin)
):
    """Delete a menu item (owner/admin only)."""
    result = await db.execute(select(MenuItem).where(MenuItem.id == item_id))
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")

    rest_result = await db.execute(select(Restaurant).where(Restaurant.id == item.restaurant_id))
    restaurant = rest_result.scalar_one_or_none()
    if payload.get("role") != "admin" and restaurant.owner_id != payload["id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not own this restaurant")

    await db.delete(item)
    await db.commit()
