"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { orderApi, type Order, ApiError } from "@/lib/api";

const STATUS_STEPS = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "🕐",
  confirmed: "✅",
  preparing: "👨‍🍳",
  out_for_delivery: "🚗",
  delivered: "📦",
  cancelled: "❌",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (!id) return;
    orderApi
      .get(id)
      .then((res) => setOrder(res.order))
      .catch(() => setError("Failed to load order"))
      .finally(() => setLoading(false));
  }, [id, user, authLoading, router]);

  const handleCancel = async () => {
    if (!order) return;
    if (!confirm("Are you sure you want to cancel this order?")) return;
    setActionLoading(true);
    try {
      await orderApi.cancel(order._id);
      setOrder({ ...order, status: "cancelled" });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to cancel");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!order) return;
    setActionLoading(true);
    try {
      const res = await orderApi.updateStatus(order._id, status);
      setOrder(res.order);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="skeleton h-8 w-1/3 rounded mb-4" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">😕</p>
        <h2 className="text-xl font-bold mb-2">Order not found</h2>
        <Link href="/orders" className="text-[#06C167] hover:underline">
          ← Back to orders
        </Link>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const canCancel = ["pending", "confirmed"].includes(order.status);
  const isOwner = user?.role === "restaurant_owner" || user?.role === "admin";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/orders"
        className="text-gray-500 hover:text-black text-sm mb-6 inline-block"
      >
        ← Back to orders
      </Link>

      {/* Order header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">{order.restaurantName}</h1>
          <p className="text-gray-500 text-sm">
            Order #{order._id.slice(-8).toUpperCase()} ·{" "}
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{STATUS_ICONS[order.status] || "📋"}</span>
          <span className="font-bold text-lg">
            {STATUS_LABELS[order.status] || order.status}
          </span>
        </div>
      </div>

      {/* Status tracker */}
      {order.status !== "cancelled" && (
        <div className="bg-gray-50 rounded-2xl p-6 mb-8">
          <h3 className="font-bold mb-4">Order Progress</h3>
          <div className="flex items-center">
            {STATUS_STEPS.map((step, i) => {
              const isCompleted = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center w-full">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition ${
                        isCompleted
                          ? "bg-[#06C167] border-[#06C167] text-white"
                          : "bg-white border-gray-300 text-gray-400"
                      } ${isCurrent ? "ring-4 ring-[#06C167]/20" : ""}`}
                    >
                      {isCompleted ? "✓" : i + 1}
                    </div>
                    <span
                      className={`text-xs mt-2 text-center ${
                        isCompleted
                          ? "text-[#06C167] font-medium"
                          : "text-gray-400"
                      }`}
                    >
                      {STATUS_LABELS[step]}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-1 ${
                        i < currentStepIndex ? "bg-[#06C167]" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Order cancelled banner */}
      {order.status === "cancelled" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8 text-center">
          <p className="text-red-700 font-medium">
            This order has been cancelled
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Order items */}
        <div>
          <h3 className="font-bold text-lg mb-4">Order Items</h3>
          <div className="space-y-3">
            {order.items.map((item, i) => (
              <div
                key={i}
                className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-gray-500 text-xs">
                    {item.quantity} × RS {item.price.toFixed(2)}
                  </p>
                </div>
                <p className="font-medium text-sm">
                  RS {item.subtotal.toFixed(2)}
                </p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t-2 border-gray-200">
              <p className="font-bold">Total</p>
              <p className="font-bold text-lg">
                RS {order.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Delivery & actions */}
        <div className="space-y-6">
          <div>
            <h3 className="font-bold text-lg mb-3">Delivery Address</h3>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
              <p>{order.deliveryAddress.street}</p>
              <p>
                {order.deliveryAddress.city}
                {order.deliveryAddress.state &&
                  `, ${order.deliveryAddress.state}`}
                {order.deliveryAddress.zipCode &&
                  ` ${order.deliveryAddress.zipCode}`}
              </p>
              {order.deliveryAddress.country && (
                <p>{order.deliveryAddress.country}</p>
              )}
            </div>
          </div>

          {order.specialInstructions && (
            <div>
              <h3 className="font-bold text-sm mb-2">Special Instructions</h3>
              <p className="text-gray-600 text-sm bg-gray-50 rounded-xl p-4">
                {order.specialInstructions}
              </p>
            </div>
          )}

          <div>
            <h3 className="font-bold text-sm mb-2">Estimated Delivery</h3>
            <p className="text-gray-600 text-sm">
              ~{order.estimatedDeliveryTime} minutes
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {canCancel && (
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="w-full border-2 border-red-500 text-red-500 font-medium py-2 rounded-xl hover:bg-red-50 transition disabled:opacity-50"
              >
                Cancel Order
              </button>
            )}

            {/* Owner/admin status update buttons */}
            {isOwner &&
              order.status !== "cancelled" &&
              order.status !== "delivered" && (
                <div>
                  <h4 className="font-medium text-sm mb-2 text-gray-600">
                    Update Status (Owner)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {STATUS_STEPS.filter(
                      (s) => STATUS_STEPS.indexOf(s) > currentStepIndex,
                    )
                      .slice(0, 1)
                      .map((s) => (
                        <button
                          key={s}
                          onClick={() => handleUpdateStatus(s)}
                          disabled={actionLoading}
                          className="bg-[#06C167] text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-[#05a758] transition disabled:opacity-50"
                        >
                          Mark as {STATUS_LABELS[s]}
                        </button>
                      ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
