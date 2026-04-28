"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { orderApi, ApiError } from "@/lib/api";

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    items,
    restaurantId,
    restaurantName,
    updateQuantity,
    removeItem,
    clearCart,
    totalAmount,
  } = useCart();

  const [address, setAddress] = useState({
    street: user?.address?.street || "",
    city: user?.address?.city || "",
    state: user?.address?.state || "",
    zipCode: user?.address?.zipCode || "",
  });
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!address.street || !address.city) {
      setError("Please fill in your delivery address");
      return;
    }
    if (!restaurantId || items.length === 0) return;

    setError("");
    setLoading(true);
    try {
      const res = await orderApi.create({
        restaurantId,
        items: items.map((i) => ({
          menuItemId: i.id,
          quantity: i.quantity,
        })),
        deliveryAddress: address,
        specialInstructions: specialInstructions || undefined,
      });
      clearCart();
      router.push(`/orders/${res.order._id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to place order. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-6xl mb-4">🛒</p>
        <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">
          Add items from a restaurant to get started
        </p>
        <Link
          href="/restaurants"
          className="bg-[#06C167] hover:bg-[#05a758] text-white font-semibold px-8 py-3 rounded-full inline-block transition"
        >
          Browse Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-2">Your Cart</h1>
      <p className="text-gray-500 mb-8">
        Ordering from{" "}
        <span className="font-medium text-black">{restaurantName}</span>
      </p>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-3 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 border border-gray-200 rounded-xl"
            >
              <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    🍽️
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{item.name}</h3>
                <p className="text-gray-500 text-xs">
                  RS {item.price.toFixed(2)} each
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-sm"
                >
                  −
                </button>
                <span className="w-8 text-center font-medium text-sm">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 text-sm"
                >
                  +
                </button>
              </div>
              <div className="w-20 text-right">
                <p className="font-bold text-sm">
                  RS {(item.price * item.quantity).toFixed(2)}
                </p>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-red-400 text-xs hover:text-red-600 mt-1"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={clearCart}
            className="text-red-500 text-sm hover:underline mt-2"
          >
            Clear Cart
          </button>
        </div>

        {/* Checkout */}
        <div className="lg:col-span-2">
          <div className="bg-gray-50 rounded-2xl p-6 sticky top-24">
            <h3 className="font-bold text-lg mb-4">Delivery Address</h3>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-3 mb-6">
              <input
                type="text"
                placeholder="Street address *"
                value={address.street}
                onChange={(e) =>
                  setAddress((a) => ({ ...a, street: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="City *"
                  value={address.city}
                  onChange={(e) =>
                    setAddress((a) => ({ ...a, city: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
                />
                <input
                  type="text"
                  placeholder="State"
                  value={address.state}
                  onChange={(e) =>
                    setAddress((a) => ({ ...a, state: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
                />
              </div>
              <input
                type="text"
                placeholder="ZIP Code"
                value={address.zipCode}
                onChange={(e) =>
                  setAddress((a) => ({ ...a, zipCode: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
              />
              <textarea
                placeholder="Special instructions (optional)"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none resize-none"
              />
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>RS {totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Delivery Fee</span>
                <span className="text-[#06C167]">Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>RS {totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-black text-white font-semibold py-3 rounded-xl mt-6 hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Placing Order..."
                : `Place Order — RS ${totalAmount.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
