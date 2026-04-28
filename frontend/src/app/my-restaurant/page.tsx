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

const emptyRestForm = {
  name: "",
  description: "",
  address: "",
  city: "",
  phone: "",
  cuisine_type: "",
  openTime: "",
  closeTime: "",
};

const emptyMenuForm = {
  name: "",
  description: "",
  price: "",
  category: "",
  preparation_time: "15",
  is_available: true,
};

function parseOpeningHours(hours?: string) {
  if (!hours) return { openTime: "", closeTime: "" };
  const [openTime = "", closeTime = ""] = hours.split("-");
  return { openTime, closeTime };
}

export default function MyRestaurantPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal visibility
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditRestForm, setShowEditRestForm] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [showEditMenuForm, setShowEditMenuForm] = useState(false);

  // Forms
  const [restForm, setRestForm] = useState(emptyRestForm);
  const [editRestForm, setEditRestForm] = useState(emptyRestForm);
  const [menuForm, setMenuForm] = useState(emptyMenuForm);
  const [editMenuForm, setEditMenuForm] = useState(emptyMenuForm);
  const [editingMenuItem, setEditingMenuItem] = useState<MenuItem | null>(null);

  // Images
  const [menuImage, setMenuImage] = useState<File | null>(null);
  const [menuImagePreview, setMenuImagePreview] = useState<string | null>(null);
  const [editMenuImage, setEditMenuImage] = useState<File | null>(null);
  const [editMenuImagePreview, setEditMenuImagePreview] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role !== "restaurant_owner" && user.role !== "admin") { router.push("/"); return; }
    loadRestaurants();
  }, [user, authLoading, router]);

  const loadRestaurants = async () => {
    setLoading(true);
    try {
      const all = await restaurantApi.list();
      const mine = all.filter((r) => r.owner_id === user?._id);
      setRestaurants(mine);
      if (mine.length > 0 && !selectedRestaurant) selectRestaurant(mine[0]);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const selectRestaurant = async (r: Restaurant) => {
    setSelectedRestaurant(r);
    try {
      const items = await restaurantApi.getMenu(r.id);
      setMenuItems(items);
    } catch { setMenuItems([]); }
  };

  // ── Create restaurant ──────────────────────────────────────────────────
  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validation
    if (restForm.name.length < 2) {
      setError("Restaurant name must be at least 2 characters long");
      return;
    }
    if (restForm.name.length > 200) {
      setError("Restaurant name must be less than 200 characters long");
      return;
    }
    if (restForm.address.length < 5) {
      setError("Address must be at least 5 characters long");
      return;
    }
    if (restForm.address.length > 500) {
      setError("Address must be less than 500 characters long");
      return;
    }
    if (restForm.city.length < 2) {
      setError("City must be at least 2 characters long");
      return;
    }
    if (restForm.city.length > 100) {
      setError("City must be less than 100 characters long");
      return;
    }
    
    setSaving(true);
    setError(""); setSaving(true);
    try {
      const opening = restForm.openTime
        ? `${restForm.openTime}-${restForm.closeTime || ""}`
        : undefined;
      const created = await restaurantApi.create({
        name: restForm.name,
        description: restForm.description || undefined,
        address: restForm.address,
        city: restForm.city,
        phone: restForm.phone || undefined,
        email: undefined, // Add email field as undefined
        image_url: undefined, // Add image_url field as undefined
        cuisine_type: restForm.cuisine_type || undefined,
        opening_hours: opening || undefined,
      } as Parameters<typeof restaurantApi.create>[0]);
      setRestaurants((prev) => [...prev, created]);
      selectRestaurant(created);
      setShowCreateForm(false);
      setRestForm(emptyRestForm);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create");
    } finally { setSaving(false); }
  };

  // ── Edit restaurant ────────────────────────────────────────────────────
  const openEditRestaurant = () => {
    if (!selectedRestaurant) return;
    const { openTime, closeTime } = parseOpeningHours(selectedRestaurant.opening_hours);
    setEditRestForm({
      name: selectedRestaurant.name,
      description: selectedRestaurant.description || "",
      address: selectedRestaurant.address,
      city: selectedRestaurant.city,
      phone: selectedRestaurant.phone || "",
      cuisine_type: selectedRestaurant.cuisine_type || "",
      openTime,
      closeTime,
    });
    setShowEditRestForm(true);
  };

  const handleEditRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    setError(""); setSaving(true);
    try {
      const opening = editRestForm.openTime
        ? `${editRestForm.openTime}-${editRestForm.closeTime || ""}`
        : undefined;
      const updated = await restaurantApi.update(selectedRestaurant.id, {
        name: editRestForm.name,
        description: editRestForm.description || undefined,
        address: editRestForm.address,
        city: editRestForm.city,
        phone: editRestForm.phone || undefined,
        cuisine_type: editRestForm.cuisine_type || undefined,
        opening_hours: opening || undefined,
      });
      setRestaurants((prev) => prev.map((r) => r.id === updated.id ? updated : r));
      setSelectedRestaurant(updated);
      setShowEditRestForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update");
    } finally { setSaving(false); }
  };

  // ── Delete restaurant ──────────────────────────────────────────────────
  const handleDeleteRestaurant = async () => {
    if (!selectedRestaurant) return;
    if (!confirm(`Delete "${selectedRestaurant.name}"? This cannot be undone.`)) return;
    setError(""); setSaving(true);
    try {
      await restaurantApi.delete(selectedRestaurant.id);
      const remaining = restaurants.filter((r) => r.id !== selectedRestaurant.id);
      setRestaurants(remaining);
      setSelectedRestaurant(null);
      setMenuItems([]);
      if (remaining.length > 0) selectRestaurant(remaining[0]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete");
    } finally { setSaving(false); }
  };

  // ── Add menu item ──────────────────────────────────────────────────────
  const handleMenuImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setMenuImage(file);
    setMenuImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurant) return;
    setError(""); setSaving(true);
    try {
      let item = await restaurantApi.addMenuItem(selectedRestaurant.id, {
        name: menuForm.name,
        description: menuForm.description || undefined,
        price: parseFloat(menuForm.price),
        category: menuForm.category || undefined,
        is_available: true,
        preparation_time: parseInt(menuForm.preparation_time) || 15,
      } as Parameters<typeof restaurantApi.addMenuItem>[1]);

      if (menuImage) {
        try { item = await restaurantApi.uploadMenuItemImage(item.id, menuImage); }
        catch { /* image upload failure is non-fatal */ }
      }

      setMenuItems((prev) => [...prev, item]);
      setShowMenuForm(false);
      setMenuForm(emptyMenuForm);
      setMenuImage(null); setMenuImagePreview(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add item");
    } finally { setSaving(false); }
  };

  // ── Edit menu item ─────────────────────────────────────────────────────
  const openEditMenuItem = (item: MenuItem) => {
    setEditingMenuItem(item);
    setEditMenuForm({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      category: item.category || "",
      preparation_time: item.preparation_time.toString(),
      is_available: item.is_available,
    });
    setEditMenuImage(null);
    setEditMenuImagePreview(item.image_url || null);
    setShowEditMenuForm(true);
  };

  const handleEditMenuImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEditMenuImage(file);
    setEditMenuImagePreview(file ? URL.createObjectURL(file) : editingMenuItem?.image_url || null);
  };

  const handleEditMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenuItem) return;
    setError(""); setSaving(true);
    try {
      let item = await restaurantApi.updateMenuItem(editingMenuItem.id, {
        name: editMenuForm.name,
        description: editMenuForm.description || undefined,
        price: parseFloat(editMenuForm.price),
        category: editMenuForm.category || undefined,
        is_available: editMenuForm.is_available,
        preparation_time: parseInt(editMenuForm.preparation_time) || 15,
      });

      if (editMenuImage) {
        try { item = await restaurantApi.uploadMenuItemImage(item.id, editMenuImage); }
        catch { /* non-fatal */ }
      }

      setMenuItems((prev) => prev.map((m) => m.id === item.id ? item : m));
      setShowEditMenuForm(false);
      setEditingMenuItem(null);
      setEditMenuImage(null); setEditMenuImagePreview(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update item");
    } finally { setSaving(false); }
  };

  // ── Delete menu item ───────────────────────────────────────────────────
  const handleDeleteMenuItem = async (item: MenuItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    setError("");
    try {
      await restaurantApi.deleteMenuItem(item.id);
      setMenuItems((prev) => prev.filter((m) => m.id !== item.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete item");
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Restaurant</h1>
          <p className="text-gray-500 text-sm mt-1 max-w-2xl">
            Manage your restaurant details, update your menu, and create new offerings.
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
          <p className="text-sm mb-6">Create your first restaurant to get started</p>
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
                    <h2 className="text-2xl font-bold">{selectedRestaurant.name}</h2>
                    <p className="text-gray-500 text-sm mt-2">
                      {selectedRestaurant.cuisine_type} · {selectedRestaurant.city}
                    </p>
                    {selectedRestaurant.description && (
                      <p className="text-gray-500 text-sm mt-4 max-w-2xl leading-6">
                        {selectedRestaurant.description}
                      </p>
                    )}
                    {selectedRestaurant.phone && (
                      <p className="text-gray-500 text-sm mt-1">{selectedRestaurant.phone}</p>
                    )}
                    {selectedRestaurant.opening_hours && (
                      <p className="text-gray-500 text-sm mt-1">
                        Hours: {selectedRestaurant.opening_hours}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center rounded-full bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1">
                        {selectedRestaurant.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className="inline-flex items-center justify-center rounded-full bg-[#06C167]/10 text-[#057A4F] text-xs font-semibold px-3 py-1">
                        {selectedRestaurant.cuisine_type}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={openEditRestaurant}
                        className="text-sm font-medium px-4 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleDeleteRestaurant}
                        disabled={saving}
                        className="text-sm font-medium px-4 py-2 border border-red-200 text-red-600 rounded-full hover:bg-red-50 transition disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Menu Items ({menuItems.length})</h3>
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
                    <p className="text-sm">No menu items yet. Add your first item!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {menuItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-3 p-3 border border-gray-200 rounded-xl"
                      >
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>🍽️</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                            <span className="text-gray-500">{item.category || "Uncategorized"}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500">{item.preparation_time} mins prep</span>
                          </div>
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <span className="font-bold text-sm">RS {item.price.toFixed(2)}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${item.is_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {item.is_available ? "Available" : "Unavailable"}
                              </span>
                              <button
                                onClick={() => openEditMenuItem(item)}
                                className="text-xs px-2 py-1 border border-gray-300 rounded-full hover:bg-gray-50 transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteMenuItem(item)}
                                className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded-full hover:bg-red-50 transition"
                              >
                                Delete
                              </button>
                            </div>
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

      {/* ── Create Restaurant Modal ─────────────────────────────────────── */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-xl mb-4">Create Restaurant</h3>
            <form onSubmit={handleCreateRestaurant} className="space-y-3">
              <RestaurantFormFields form={restForm} setForm={setRestForm} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-xl hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#06C167] text-white font-medium py-2 rounded-xl hover:bg-[#05a758] transition disabled:opacity-50">
                  {saving ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Restaurant Modal ───────────────────────────────────────── */}
      {showEditRestForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-xl mb-4">Edit Restaurant</h3>
            <form onSubmit={handleEditRestaurant} className="space-y-3">
              <RestaurantFormFields form={editRestForm} setForm={setEditRestForm} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditRestForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-xl hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#06C167] text-white font-medium py-2 rounded-xl hover:bg-[#05a758] transition disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Menu Item Modal ─────────────────────────────────────────── */}
      {showMenuForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-xl mb-4">Add Menu Item</h3>
            <form onSubmit={handleAddMenuItem} className="space-y-3">
              <MenuItemFormFields form={menuForm} setForm={setMenuForm} showAvailability={false} />
              <ImageUploadField
                preview={menuImagePreview}
                onChange={handleMenuImageChange}
                onClear={() => { setMenuImage(null); setMenuImagePreview(null); }}
              />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowMenuForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-xl hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#06C167] text-white font-medium py-2 rounded-xl hover:bg-[#05a758] transition disabled:opacity-50">
                  {saving ? "Adding..." : "Add Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Menu Item Modal ────────────────────────────────────────── */}
      {showEditMenuForm && editingMenuItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-xl mb-4">Edit Menu Item</h3>
            <form onSubmit={handleEditMenuItem} className="space-y-3">
              <MenuItemFormFields form={editMenuForm} setForm={setEditMenuForm} showAvailability={true} />
              <ImageUploadField
                preview={editMenuImagePreview}
                onChange={handleEditMenuImageChange}
                onClear={() => { setEditMenuImage(null); setEditMenuImagePreview(null); }}
                label="Change Image"
              />
              <div className="flex gap-3 pt-2">
                <button type="button"
                  onClick={() => { setShowEditMenuForm(false); setEditingMenuItem(null); }}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-xl hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-[#06C167] text-white font-medium py-2 rounded-xl hover:bg-[#05a758] transition disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────

type RestFormState = {
  name: string; description: string; address: string;
  city: string; phone: string; cuisine_type: string;
  openTime: string; closeTime: string;
};

function RestaurantFormFields({
  form,
  setForm,
}: {
  form: RestFormState;
  setForm: React.Dispatch<React.SetStateAction<RestFormState>>;
}) {
  const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none";
  return (
    <>
      <input type="text" placeholder="Restaurant name *" value={form.name} required
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
      <textarea placeholder="Description" value={form.description} rows={2}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        className={inputCls + " resize-none"} />
      <input type="text" placeholder="Address *" value={form.address} required
        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className={inputCls} />
      <div className="grid grid-cols-2 gap-3">
        <input type="text" placeholder="City *" value={form.city} required
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className={inputCls} />
        <select value={form.cuisine_type} required
          onChange={(e) => setForm((f) => ({ ...f, cuisine_type: e.target.value }))}
          className={inputCls + " bg-white"}>
          <option value="" disabled>Cuisine type *</option>
          {CUISINE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input type="tel" placeholder="Phone" value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={inputCls} />
        <div className="flex gap-2">
          <input type="time" value={form.openTime}
            onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))}
            className="w-1/2 px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] outline-none" />
          <input type="time" value={form.closeTime}
            onChange={(e) => setForm((f) => ({ ...f, closeTime: e.target.value }))}
            className="w-1/2 px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] outline-none" />
        </div>
      </div>
    </>
  );
}

type MenuFormState = {
  name: string; description: string; price: string;
  category: string; preparation_time: string; is_available: boolean;
};

function MenuItemFormFields({
  form,
  setForm,
  showAvailability,
}: {
  form: MenuFormState;
  setForm: React.Dispatch<React.SetStateAction<MenuFormState>>;
  showAvailability: boolean;
}) {
  const inputCls = "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none";
  return (
    <>
      <input type="text" placeholder="Item name *" value={form.name} required
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
      <textarea placeholder="Description" value={form.description} rows={2}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        className={inputCls + " resize-none"} />
      <div className="grid grid-cols-2 gap-3">
        <input type="number" step="0.01" placeholder="Price *" value={form.price} required
          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className={inputCls} />
        <input type="text" placeholder="Category" value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputCls} />
      </div>
      <input type="number" placeholder="Preparation time (minutes)" value={form.preparation_time}
        onChange={(e) => setForm((f) => ({ ...f, preparation_time: e.target.value }))} className={inputCls} />
      {showAvailability && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.is_available}
            onChange={(e) => setForm((f) => ({ ...f, is_available: e.target.checked }))}
            className="w-4 h-4 accent-[#06C167]" />
          <span className="text-sm font-medium text-gray-700">Available for ordering</span>
        </label>
      )}
    </>
  );
}

function ImageUploadField({
  preview,
  onChange,
  onClear,
  label = "Item Image",
}: {
  preview: string | null;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  label?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} <span className="text-gray-400 font-normal">(optional)</span>
      </label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={onChange}
        className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-[#06C167]/10 file:text-[#057A4F] hover:file:bg-[#06C167]/20 cursor-pointer"
      />
      {preview && (
        <div className="mt-2 relative w-24 h-24">
          <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-xl border border-gray-200" />
          <button
            type="button"
            onClick={onClear}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
