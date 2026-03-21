"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  restaurantApi,
  type RestaurantWithMenu,
  type MenuItem,
} from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { items: cartItems, addItem, restaurantId: cartRestId } = useCart();
  const [restaurant, setRestaurant] = useState<RestaurantWithMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showDiffWarning, setShowDiffWarning] = useState(false);
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    if (!id) return;
    restaurantApi
      .get(id)
      .then((data) => {
        setRestaurant(data);
        // Set first category as active
        const categories = [
          ...new Set(data.menu_items?.map((i) => i.category || "Other")),
        ];
        if (categories.length > 0) setActiveCategory(categories[0]);
      })
      .catch(() => setError("Failed to load restaurant"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddItem = (item: MenuItem) => {
    if (!user) return;
    if (cartRestId && cartRestId !== id) {
      setPendingItem(item);
      setShowDiffWarning(true);
      return;
    }
    addItem(item, id, restaurant!.name);
  };

  const confirmAddItem = () => {
    if (pendingItem && restaurant) {
      addItem(pendingItem, id, restaurant.name);
    }
    setShowDiffWarning(false);
    setPendingItem(null);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="skeleton h-64 w-full rounded-2xl mb-6" />
        <div className="skeleton h-8 w-1/3 rounded mb-4" />
        <div className="skeleton h-4 w-1/2 rounded mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <p className="text-5xl mb-4">😕</p>
        <h2 className="text-xl font-bold mb-2">Restaurant not found</h2>
        <Link href="/restaurants" className="text-[#06C167] hover:underline">
          ← Back to restaurants
        </Link>
      </div>
    );
  }

  const menuItems = restaurant.menu_items || [];
  const categories = [...new Set(menuItems.map((i) => i.category || "Other"))];
  const filteredItems = activeCategory
    ? menuItems.filter((i) => (i.category || "Other") === activeCategory)
    : menuItems;

  const getCartQty = (itemId: string) => {
    const ci = cartItems.find((i) => i.id === itemId);
    return ci ? ci.quantity : 0;
  };

  return (
    <div>
      {/* Restaurant Header */}
      <div className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            href="/restaurants"
            className="text-gray-400 hover:text-white text-sm mb-4 inline-block"
          >
            ← Back to restaurants
          </Link>
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="w-32 h-32 rounded-2xl bg-gray-800 overflow-hidden flex-shrink-0">
              {restaurant.image_url ? (
                <img
                  src={restaurant.image_url}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl">
                  🍽️
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {restaurant.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-gray-400 text-sm">
                {restaurant.cuisine_type && (
                  <span className="bg-gray-800 px-3 py-1 rounded-full">
                    {restaurant.cuisine_type}
                  </span>
                )}
                {restaurant.rating > 0 && (
                  <span>⭐ {restaurant.rating.toFixed(1)}</span>
                )}
                <span>📍 {restaurant.city}</span>
                {restaurant.opening_hours && (
                  <span>🕐 {restaurant.opening_hours}</span>
                )}
              </div>
              {restaurant.description && (
                <p className="text-gray-400 mt-3 text-sm max-w-2xl">
                  {restaurant.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold mb-6">Menu</h2>

        {menuItems.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-lg font-medium">No menu items yet</p>
          </div>
        ) : (
          <>
            {/* Category tabs */}
            {categories.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                      activeCategory === cat
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {/* Menu items grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex gap-4 p-4 rounded-xl border transition ${
                    item.is_available
                      ? "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                      : "border-gray-100 opacity-60"
                  }`}
                >
                  {/* Item image */}
                  <div className="w-28 h-28 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">
                        🍽️
                      </div>
                    )}
                  </div>

                  {/* Item details */}
                  <div className="flex-1 flex flex-col">
                    <h3 className="font-bold text-sm">{item.name}</h3>
                    {item.description && (
                      <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="font-bold text-sm">
                        ${item.price.toFixed(2)}
                      </span>
                      {item.is_available && user ? (
                        <div className="flex items-center gap-2">
                          {getCartQty(item.id) > 0 && (
                            <span className="text-xs text-[#06C167] font-medium">
                              {getCartQty(item.id)} in cart
                            </span>
                          )}
                          <button
                            onClick={() => handleAddItem(item)}
                            className="bg-[#06C167] hover:bg-[#05a758] text-white text-xs font-semibold px-4 py-2 rounded-full transition"
                          >
                            Add +
                          </button>
                        </div>
                      ) : !user ? (
                        <Link
                          href="/login"
                          className="text-xs text-[#06C167] font-medium hover:underline"
                        >
                          Login to order
                        </Link>
                      ) : (
                        <span className="text-xs text-red-400">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Different restaurant warning modal */}
      {showDiffWarning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-lg mb-2">Start a new order?</h3>
            <p className="text-gray-500 text-sm mb-6">
              Adding items from this restaurant will clear your current cart.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDiffWarning(false)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmAddItem}
                className="flex-1 bg-[#06C167] text-white font-medium py-2 rounded-xl hover:bg-[#05a758] transition"
              >
                Start New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
