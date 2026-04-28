"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  restaurantApi,
  orderApi,
  type Restaurant,
  type Order,
  ApiError,
} from "@/lib/api";

const STATUS_FLOW: Record<string, string> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "delivered",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-orange-100 text-orange-800 border-orange-200",
  out_for_delivery: "bg-purple-100 text-purple-800 border-purple-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function OwnerOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const prevOrderCount = useRef(0);
  const selectedRestaurantRef = useRef<Restaurant | null>(null);

  // Keep ref in sync so the polling interval always uses fresh restaurant
  useEffect(() => {
    selectedRestaurantRef.current = selectedRestaurant;
  }, [selectedRestaurant]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "restaurant_owner" && user.role !== "admin") {
      router.push("/restaurants");
      return;
    }
    loadRestaurants();
  }, [user, authLoading]);

  const loadRestaurants = async () => {
    try {
      const all = await restaurantApi.list();
      const mine = all.filter((r) => r.owner_id === user?._id);
      setRestaurants(mine);
      if (mine.length > 0) {
        selectRestaurant(mine[0]);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  // Silent background poll — doesn't show full loading spinner
  const pollOrders = useCallback(async () => {
    const r = selectedRestaurantRef.current;
    if (!r) return;
    try {
      const res = await orderApi.listByRestaurant(r.id, 1, 50);
      const newOrders = res.orders;
      // Detect newly arrived orders
      const newPendingCount = newOrders.filter(
        (o) => o.status === "pending",
      ).length;
      if (
        prevOrderCount.current > 0 &&
        newOrders.length > prevOrderCount.current
      ) {
        setNewOrderAlert(true);
      }
      prevOrderCount.current = newOrders.length;
      setOrders(newOrders);
    } catch {
      // Silent failure
    }
  }, []);

  // Set up 15-second polling whenever a restaurant is selected
  useEffect(() => {
    if (!selectedRestaurant) return;
    prevOrderCount.current = 0; // reset on restaurant switch
    const interval = setInterval(pollOrders, 15000);
    return () => clearInterval(interval);
  }, [selectedRestaurant, pollOrders]);

  const selectRestaurant = async (r: Restaurant) => {
    setSelectedRestaurant(r);
    setNewOrderAlert(false);
    setLoading(true);
    setError("");
    try {
      const res = await orderApi.listByRestaurant(r.id, 1, 50);
      prevOrderCount.current = res.orders.length;
      setOrders(res.orders);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStatus = async (order: Order) => {
    const nextStatus = STATUS_FLOW[order.status];
    if (!nextStatus) return;
    setUpdatingId(order._id);
    setError("");
    try {
      const updated = await orderApi.updateStatus(order._id, nextStatus);
      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? updated.order : o)),
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update status",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancel = async (order: Order) => {
    if (!confirm("Cancel this order?")) return;
    setUpdatingId(order._id);
    setError("");
    try {
      const updated = await orderApi.updateStatus(order._id, "cancelled");
      setOrders((prev) =>
        prev.map((o) => (o._id === order._id ? updated.order : o)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to cancel");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders =
    statusFilter === "all"
      ? orders
      : orders.filter((o) => o.status === statusFilter);

  const countByStatus = (status: string) =>
    orders.filter((o) => o.status === status).length;

  if (authLoading || !user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Incoming Orders</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage and update orders for your restaurants
          </p>
        </div>
        <span className="text-xs text-gray-400">Auto-refreshes every 15s</span>
      </div>

      {/* New-order alert banner */}
      {newOrderAlert && (
        <div className="flex items-center justify-between bg-[#06C167]/10 border border-[#06C167] text-[#05a758] px-4 py-3 rounded-xl mb-4 text-sm font-medium">
          <span>🔔 New orders have arrived!</span>
          <button
            onClick={() => setNewOrderAlert(false)}
            className="text-[#05a758] hover:text-green-800 font-bold text-base leading-none ml-4"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      {restaurants.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🏪</p>
          <p className="text-lg font-medium">No restaurants yet</p>
          <p className="text-sm mt-1 mb-6">
            Create a restaurant first to start receiving orders
          </p>
          <a
            href="/my-restaurant"
            className="bg-[#06C167] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#05a758] transition inline-block"
          >
            Set Up Restaurant
          </a>
        </div>
      ) : (
        <>
          {/* Restaurant selector */}
          {restaurants.length > 1 && (
            <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
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

          {/* Summary pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {(
              [
                "all",
                "pending",
                "confirmed",
                "preparing",
                "out_for_delivery",
                "delivered",
                "cancelled",
              ] as const
            ).map((s) => {
              const count = s === "all" ? orders.length : countByStatus(s);
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                    statusFilter === s
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {s === "all" ? "All" : STATUS_LABELS[s]}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === s ? "bg-white/20" : "bg-gray-100"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Orders list */}
          {loading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-32 rounded-2xl" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-2xl">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-medium">
                No{" "}
                {statusFilter === "all"
                  ? ""
                  : statusFilter.replace(/_/g, " ") + " "}
                orders yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order._id}
                  className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Order ID & status */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-base">
                          #{order._id.slice(-8).toUpperCase()}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700 border-gray-200"}`}
                        >
                          {STATUS_LABELS[order.status] || order.status}
                        </span>
                      </div>

                      {/* Customer */}
                      <p className="text-sm text-gray-700 font-medium">
                        👤 {order.customerName}
                        {order.customerPhone && (
                          <span className="text-gray-400 font-normal">
                            {" "}
                            · {order.customerPhone}
                          </span>
                        )}
                      </p>

                      {/* Delivery address */}
                      <p className="text-xs text-gray-500 mt-1">
                        📍 {order.deliveryAddress.street},{" "}
                        {order.deliveryAddress.city}
                        {order.deliveryAddress.state
                          ? `, ${order.deliveryAddress.state}`
                          : ""}
                      </p>

                      {/* Items */}
                      <div className="mt-3 border-t border-gray-100 pt-3">
                        <p className="text-xs text-gray-500 font-medium mb-1">
                          ORDER ITEMS
                        </p>
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-gray-700">
                                {item.quantity}× {item.name}
                              </span>
                              <span className="text-gray-500">
                                RS {item.subtotal.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {order.specialInstructions && (
                          <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                            📝 {order.specialInstructions}
                          </p>
                        )}
                      </div>

                      {/* Total & time */}
                      <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleString()}
                        </p>
                        <p className="font-bold text-base">
                          RS {order.totalAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    {order.status !== "delivered" &&
                      order.status !== "cancelled" && (
                        <div className="flex flex-col gap-2 sm:min-w-[160px]">
                          {STATUS_FLOW[order.status] && (
                            <button
                              onClick={() => handleAdvanceStatus(order)}
                              disabled={updatingId === order._id}
                              className="w-full bg-[#06C167] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#05a758] transition disabled:opacity-50"
                            >
                              {updatingId === order._id
                                ? "Updating..."
                                : `Mark as ${STATUS_LABELS[STATUS_FLOW[order.status]]}`}
                            </button>
                          )}
                          {order.status !== "out_for_delivery" && (
                            <button
                              onClick={() => handleCancel(order)}
                              disabled={updatingId === order._id}
                              className="w-full border border-red-200 text-red-600 text-sm font-medium px-4 py-2 rounded-xl hover:bg-red-50 transition disabled:opacity-50"
                            >
                              Cancel Order
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
