"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { notificationApi, type Notification } from "@/lib/api";

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { refetch } = useNotifications();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    setLoading(true);
    notificationApi
      .list(user._id, filter === "unread")
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [user, authLoading, filter, router]);

  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      // Update badge count in Navbar
      refetch();
    } catch {
      // ignore
    }
  };

  if (authLoading || (!user && !authLoading)) return null;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">
              {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === "all"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              filter === "unread"
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Unread
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🔔</p>
          <h2 className="text-xl font-bold mb-2">No notifications</h2>
          <p className="text-sm">
            {filter === "unread"
              ? "All caught up! No unread notifications."
              : "You'll see order updates and alerts here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border transition ${
                notif.is_read
                  ? "border-gray-100 bg-white"
                  : "border-[#06C167]/20 bg-[#06C167]/5"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#06C167] flex-shrink-0" />
                    )}
                    <h3 className="font-bold text-sm truncate">
                      {notif.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm">{notif.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-gray-400 text-xs">
                      {new Date(notif.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {notif.order_id && (
                      <Link
                        href={`/orders/${notif.order_id}`}
                        className="text-[#06C167] text-xs font-medium hover:underline"
                      >
                        View Order →
                      </Link>
                    )}
                  </div>
                </div>
                {!notif.is_read && (
                  <button
                    onClick={() => markAsRead(notif.id)}
                    className="text-xs text-gray-500 hover:text-gray-700 whitespace-nowrap"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
