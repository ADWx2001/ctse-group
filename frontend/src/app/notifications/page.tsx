"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { notificationApi, type Notification } from "@/lib/api";

interface CreateNotificationForm {
  user_id: string | null;
  user_email: string | null;
  type: string;
  title: string;
  message: string;
  send_email: boolean;
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { refetch } = useNotifications();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateNotificationForm>({
    user_id: null,
    user_email: null,
    type: "manual_announcement",
    title: "",
    message: "",
    send_email: false,
  });
  const [creating, setCreating] = useState(false);

  const isAdmin = user?.role === "admin";
  const isOwner = user?.role === "restaurant_owner";
  const canCreateNotifications = isAdmin || isOwner;

  
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    setLoading(true);
    
    // For admin and restaurant owners, fetch all notifications
    // For regular users, fetch only their notifications
    const fetchNotifications = async () => {
      try {
        if (isAdmin || isOwner) {
          // Fetch all notifications for admin/restaurant owners
          const allNotifications = await notificationApi.list("admin", filter === "unread");
          setNotifications(allNotifications);
        } else {
          // Fetch user-specific notifications for regular users
          const userNotifications = await notificationApi.list(user._id, filter === "unread");
          setNotifications(userNotifications);
        }
      } catch (error) {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchNotifications();
  }, [user, authLoading, filter, router, isAdmin, isOwner]);

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

  const deleteNotification = async (id: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) {
      return;
    }
    
    try {
      await fetch(`${process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL || "http://localhost:3004"}/api/notifications/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      refetch();
    } catch {
      // ignore
    }
  };

  const createNotification = async () => {
    if (!createForm.title || !createForm.message) {
      alert("Please fill in title and message");
      return;
    }

    setCreating(true);
    try {
      // Use form data directly for targeting specific users
      const notificationData = {
        ...createForm,
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL || "http://localhost:3004"}/api/notifications/admin/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(notificationData),
      });

      if (response.ok) {
        const newNotification = await response.json();
        setNotifications((prev) => [newNotification, ...prev]);
        setShowCreateModal(false);
        setCreateForm({
          user_id: "",
          user_email: "",
          type: "manual_announcement",
          title: "",
          message: "",
          send_email: false,
        });
        refetch();
      } else {
        const error = await response.json();
        alert(`Failed to create notification: ${error.detail || "Unknown error"}`);
      }
    } catch (error) {
      alert("Failed to create notification. Please try again.");
    } finally {
      setCreating(false);
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
          {canCreateNotifications && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-full text-sm font-medium transition bg-[#06C167] text-white hover:bg-[#05a057]"
            >
              Create
            </button>
          )}
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
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
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
                    {(isAdmin || isOwner) && notif.user_id === "system" && (
                      <button
                        onClick={() => deleteNotification(notif.id)}
                        className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap"
                        title="Delete notification"
                      >
                        🗑️ Delete
                      </button>
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

      {/* Create Notification Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Create Notification</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C167]"
                >
                  <option value="manual_announcement">Announcement</option>
                  <option value="system_update">System Update</option>
                  <option value="promotion">Promotion</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C167]"
                  placeholder="Enter notification title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Message *</label>
                <textarea
                  value={createForm.message}
                  onChange={(e) => setCreateForm({ ...createForm, message: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#06C167]"
                  placeholder="Enter notification message"
                  rows={3}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="send_email"
                  checked={createForm.send_email}
                  onChange={(e) => setCreateForm({ ...createForm, send_email: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="send_email" className="text-sm">
                  Send email notification
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createNotification}
                disabled={creating}
                className="flex-1 px-4 py-2 bg-[#06C167] text-white rounded-lg hover:bg-[#05a057] disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
