"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  restaurantApi,
  type Restaurant,
  type MenuItem,
  ApiError,
} from "@/lib/api";

const CUISINE_OPTIONS = [
  "Sri Lankan",
  "Indian",
  "Chinese",
  "Italian",
  "Japanese",
  "Thai",
  "Fast Food",
  "Desserts",
  "Mexican",
  "Mediterranean",
  "Beverages",
];

export default function MyRestaurantPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);

  // Create restaurant form
  const [restForm, setRestForm] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    phone: "",
    cuisine_type: "",
    opening_hours: "",
  });

  // Add menu item form
  const [menuForm, setMenuForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    preparation_time: "15",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "restaurant_owner" && user.role !== "admin") {
      router.push("/");
      return;
    }
    loadRestaurants();
  }, [user, authLoading, router]);

  const loadRestaurants = async () => {
    setLoading(true);
    try {
      const all = await restaurantApi.list();
      const mine = all.filter((r) => r.owner_id === user?._id);
      setRestaurants(mine);
      if (mine.length > 0 && !selectedRestaurant) {
        selectRestaurant(mine[0]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const selectRestaurant = async (r: Restaurant) => {
    setSelectedRestaurant(r);
    try {
      const items = await restaurantApi.getMenu(r.id);
      setMenuItems(items);
    } catch {
      setMenuItems([]);
    }
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const created = await restaurantApi.create({
        name: restForm.name,
        description: restForm.description || undefined,
        address: restForm.address,
        city: restForm.city,
        phone: restForm.phone || undefined,
        cuisine_type: restForm.cuisine_type || undefined,
        opening_hours: restForm.opening_hours || undefined,
      } as Parameters<typeof restaurantApi.create>[0]);
      setRestaurants((prev) => [...prev, created]);
      selectRestaurant(created);
      setShowCreateForm(false);
      setRestForm({
        name: "",
        description: "",
        address: "",
        city: "",
        phone: "",
        cuisine_type: "",
        opening_hours: "",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    setError("");
    setSaving(true);
    try {
      const item = await restaurantApi.addMenuItem(selectedRestaurant.id, {
        name: menuForm.name,
        description: menuForm.description || undefined,
        price: parseFloat(menuForm.price),
        category: menuForm.category || undefined,
        is_available: true,
        preparation_time: parseInt(menuForm.preparation_time) || 15,
      } as Parameters<typeof restaurantApi.addMenuItem>[1]);
      setMenuItems((prev) => [...prev, item]);
      setShowMenuForm(false);
      setMenuForm({
        name: "",
        description: "",
        price: "",
        category: "",
        preparation_time: "15",
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Restaurant</h1>
          <p className="text-gray-500 text-sm mt-1 max-w-2xl">
            Manage your restaurant details, update your menu, and create new offerings with a modern control panel.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-[#06C167] hover:bg-[#05a758] text-white font-semibold px-6 py-3 rounded-full shadow-md transition"
        >
          + New Restaurant
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-20 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      ) : restaurants.length === 0 && !showCreateForm ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🏪</p>
          <h2 className="text-xl font-bold mb-2">No restaurants yet</h2>
          <p className="text-sm mb-6">
            Create your first restaurant to get started
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-[#06C167] hover:bg-[#05a758] text-white font-semibold px-8 py-3 rounded-full transition"
          >
            Create Restaurant
          </button>
        </div>
      ) : (
        <>
          {/* Restaurant selector */}
          {restaurants.length > 0 && (
            <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
              {restaurants.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectRestaurant(r)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    selectedRestaurant?.id === r.id
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          )}

          {/* Selected restaurant details */}
          {selectedRestaurant && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
                <div className="grid gap-6 md:grid-cols-[1fr_auto] items-start">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {selectedRestaurant.name}
                    </h2>
                    <p className="text-gray-500 text-sm mt-2">
                      {selectedRestaurant.cuisine_type} · {selectedRestaurant.city}
                    </p>
                    {selectedRestaurant.description && (
                      <p className="text-gray-500 text-sm mt-4 max-w-2xl leading-6">
                        {selectedRestaurant.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1">
                      {selectedRestaurant.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="inline-flex items-center justify-center rounded-full bg-[#06C167]/10 text-[#057A4F] text-xs font-semibold px-3 py-1">
                      {selectedRestaurant.cuisine_type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">
                    Menu Items ({menuItems.length})
                  </h3>
                  <button
                    onClick={() => setShowMenuForm(true)}
                    className="bg-black text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-gray-800 transition"
                  >
                    + Add Item
                  </button>
                </div>

                {menuItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="text-sm">
                      No menu items yet. Add your first item!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {menuItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-3 p-3 border border-gray-200 rounded-xl"
                      >
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">
                          🍽️
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">
                            {item.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                            <span className="text-gray-500">
                              {item.category || "Uncategorized"}
                            </span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">
                              {item.preparation_time} mins prep
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-3 gap-3">
                            <span className="font-bold text-sm">
                              RS {item.price.toFixed(2)}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${item.is_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                            >
                              {item.is_available ? "Available" : "Unavailable"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Restaurant Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-xl mb-4">Create Restaurant</h3>
            <form onSubmit={handleCreateRestaurant} className="space-y-3">
              <input
                type="text"
                placeholder="Restaurant name *"
                value={restForm.name}
                onChange={(e) =>
                  setRestForm((f) => ({ ...f, name: e.target.value }))
                }
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
              />
              <textarea
                placeholder="Description"
                value={restForm.description}
                onChange={(e) =>
                  setRestForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none resize-none"
              />
              <input
                type="text"
                placeholder="Address *"
                value={restForm.address}
                onChange={(e) =>
                  setRestForm((f) => ({ ...f, address: e.target.value }))
                }
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="City *"
                  value={restForm.city}
                  onChange={(e) =>
                    setRestForm((f) => ({ ...f, city: e.target.value }))
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
                />
                <select
                  value={restForm.cuisine_type}
                  onChange={(e) =>
                    setRestForm((f) => ({ ...f, cuisine_type: e.target.value }))
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none bg-white"
                >
                  <option value="" disabled>
                    Select cuisine type *
                  </option>
                  {CUISINE_OPTIONS.map((cuisine) => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="tel"
                  placeholder="Phone"
                  value={restForm.phone}
                  onChange={(e) =>
                    setRestForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
                />
                <input
                  type="text"
                  placeholder="Opening hours"
                  value={restForm.opening_hours}
                  onChange={(e) =>
                    setRestForm((f) => ({
                      ...f,
                      opening_hours: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#06C167] text-white font-medium py-2 rounded-xl hover:bg-[#05a758] transition disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Menu Item Modal */}
      {showMenuForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-bold text-xl mb-4">Add Menu Item</h3>
            <form onSubmit={handleAddMenuItem} className="space-y-3">
              <input
                type="text"
                placeholder="Item name *"
                value={menuForm.name}
                onChange={(e) =>
                  setMenuForm((f) => ({ ...f, name: e.target.value }))
                }
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
              />
              <textarea
                placeholder="Description"
                value={menuForm.description}
                onChange={(e) =>
                  setMenuForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none resize-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price *"
                  value={menuForm.price}
                  onChange={(e) =>
                    setMenuForm((f) => ({ ...f, price: e.target.value }))
                  }
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
                />
                <input
                  type="text"
                  placeholder="Category"
                  value={menuForm.category}
                  onChange={(e) =>
                    setMenuForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
                />
              </div>
              <input
                type="number"
                placeholder="Preparation time (minutes)"
                value={menuForm.preparation_time}
                onChange={(e) =>
                  setMenuForm((f) => ({
                    ...f,
                    preparation_time: e.target.value,
                  }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMenuForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-[#06C167] text-white font-medium py-2 rounded-xl hover:bg-[#05a758] transition disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
