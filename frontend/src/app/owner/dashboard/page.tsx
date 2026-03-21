"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  restaurantApi,
  orderApi,
  type Restaurant,
  type Order,
} from "@/lib/api";

export default function OwnerDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    totalRestaurants: 0,
    totalMenuItems: 0,
    pendingOrders: 0,
    totalOrdersToday: 0,
    revenueToday: 0,
  });
  const [loading, setLoading] = useState(true);

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
    loadDashboard();
  }, [user, authLoading]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const all = await restaurantApi.list();
      const mine = all.filter((r) => r.owner_id === user?._id);
      setRestaurants(mine);

      // Load menu counts + orders for each restaurant
      let totalMenuItems = 0;
      let pendingOrders = 0;
      let totalOrdersToday = 0;
      let revenueToday = 0;
      const allRecentOrders: Order[] = [];

      const today = new Date().toDateString();

      await Promise.all(
        mine.map(async (r) => {
          // menu count
          const menu = await restaurantApi.getMenu(r.id).catch(() => []);
          totalMenuItems += menu.length;

          // orders
          const res = await orderApi
            .listByRestaurant(r.id, 1, 50)
            .catch(() => null);
          if (res?.orders) {
            allRecentOrders.push(...res.orders);
            res.orders.forEach((o) => {
              if (
                o.status === "pending" ||
                o.status === "confirmed" ||
                o.status === "preparing"
              ) {
                pendingOrders++;
              }
              if (new Date(o.createdAt).toDateString() === today) {
                totalOrdersToday++;
                revenueToday += o.totalAmount;
              }
            });
          }
        }),
      );

      // Sort by date, take latest 5
      allRecentOrders.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setRecentOrders(allRecentOrders.slice(0, 5));

      setStats({
        totalRestaurants: mine.length,
        totalMenuItems,
        pendingOrders,
        totalOrdersToday,
        revenueToday,
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    preparing: "bg-orange-100 text-orange-800",
    out_for_delivery: "bg-purple-100 text-purple-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Welcome back, {user.name.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Here's what's happening with your restaurants today.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              emoji="🏪"
              label="Restaurants"
              value={stats.totalRestaurants}
              sub="listed"
              color="bg-black text-white"
            />
            <StatCard
              emoji="📋"
              label="Menu Items"
              value={stats.totalMenuItems}
              sub="across all restaurants"
              color="bg-[#06C167] text-white"
            />
            <StatCard
              emoji="⏳"
              label="Pending Orders"
              value={stats.pendingOrders}
              sub="need attention"
              color={
                stats.pendingOrders > 0
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-800"
              }
            />
            <StatCard
              emoji="💰"
              label="Today's Revenue"
              value={`$${stats.revenueToday.toFixed(2)}`}
              sub={`${stats.totalOrdersToday} order${stats.totalOrdersToday !== 1 ? "s" : ""}`}
              color="bg-blue-600 text-white"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Link
              href="/my-restaurant"
              className="group flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:shadow-md hover:border-[#06C167] transition"
            >
              <span className="text-3xl">🍽️</span>
              <div>
                <p className="font-bold text-base group-hover:text-[#06C167] transition">
                  Manage Restaurants
                </p>
                <p className="text-sm text-gray-500">
                  Edit info, add menu items
                </p>
              </div>
            </Link>
            <Link
              href="/owner/orders"
              className="group flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:shadow-md hover:border-[#06C167] transition"
            >
              <span className="text-3xl">📦</span>
              <div>
                <p className="font-bold text-base group-hover:text-[#06C167] transition">
                  Incoming Orders
                </p>
                <p className="text-sm text-gray-500">
                  View & update order status
                </p>
              </div>
            </Link>
            <Link
              href="/notifications"
              className="group flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:shadow-md hover:border-[#06C167] transition"
            >
              <span className="text-3xl">🔔</span>
              <div>
                <p className="font-bold text-base group-hover:text-[#06C167] transition">
                  Notifications
                </p>
                <p className="text-sm text-gray-500">Stay updated</p>
              </div>
            </Link>
          </div>

          {/* Restaurants Overview */}
          {restaurants.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <p className="text-5xl mb-4">🏪</p>
              <h2 className="text-xl font-bold mb-2">No restaurants yet</h2>
              <p className="text-gray-500 text-sm mb-6">
                Get started by setting up your first restaurant
              </p>
              <Link
                href="/my-restaurant"
                className="bg-[#06C167] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#05a758] transition inline-block"
              >
                Create Restaurant
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* My Restaurants */}
              <div className="lg:col-span-1">
                <h2 className="text-lg font-bold mb-4">My Restaurants</h2>
                <div className="space-y-3">
                  {restaurants.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                        🍽️
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {r.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {r.cuisine_type} · {r.city}
                        </p>
                        <span
                          className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full mt-1 ${r.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {r.is_active ? "● Active" : "● Inactive"}
                        </span>
                      </div>
                      <Link
                        href="/my-restaurant"
                        className="text-xs text-[#06C167] font-medium hover:underline flex-shrink-0"
                      >
                        Manage
                      </Link>
                    </div>
                  ))}
                  <Link
                    href="/my-restaurant"
                    className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-[#06C167] hover:text-[#06C167] transition"
                  >
                    + Add Restaurant
                  </Link>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Recent Orders</h2>
                  <Link
                    href="/owner/orders"
                    className="text-sm text-[#06C167] font-medium hover:underline"
                  >
                    View all
                  </Link>
                </div>
                {recentOrders.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl text-gray-500">
                    <p className="text-3xl mb-2">📭</p>
                    <p className="text-sm">
                      No orders yet. They'll show up here once customers start
                      ordering.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentOrders.map((order) => (
                      <Link
                        key={order._id}
                        href={`/owner/orders`}
                        className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-sm hover:border-gray-300 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm truncate">
                              #{order._id.slice(-6).toUpperCase()}
                            </p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[order.status] || "bg-gray-100 text-gray-700"}`}
                            >
                              {order.status.replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">
                            {order.restaurantName} · {order.items.length} item
                            {order.items.length !== 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p className="font-bold text-sm flex-shrink-0">
                          ${order.totalAmount.toFixed(2)}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  emoji,
  label,
  value,
  sub,
  color,
}: {
  emoji: string;
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div className={`${color} rounded-2xl p-5`}>
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium mt-0.5 opacity-90">{label}</div>
      <div className="text-xs opacity-70 mt-0.5">{sub}</div>
    </div>
  );
}
