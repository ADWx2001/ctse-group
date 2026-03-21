"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import { notificationApi, type Notification } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface NotificationContextType {
  unreadCount: number;
  notifications: Notification[];
  refetch: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  notifications: [],
  refetch: () => {},
});

export function useNotifications() {
  return useContext(NotificationContext);
}

interface Toast {
  id: number;
  title: string;
  message: string;
  type: string;
}

const TYPE_ICON: Record<string, string> = {
  order_confirmation: "🎉",
  order_status_update: "📦",
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seenIds = useRef<Set<string>>(new Set());
  const toastIdRef = useRef(0);
  const initialLoad = useRef(true);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await notificationApi.list(user._id, false);

      // On first load, just seed the seen set — no toasts
      if (initialLoad.current) {
        data.forEach((n) => seenIds.current.add(n.id));
        initialLoad.current = false;
      } else {
        // Show toast for each genuinely new notification
        const newOnes = data.filter((n) => !seenIds.current.has(n.id));
        newOnes.forEach((n) => {
          seenIds.current.add(n.id);
          const tid = ++toastIdRef.current;
          setToasts((prev) => [
            ...prev,
            { id: tid, title: n.title, message: n.message, type: n.type },
          ]);
          setTimeout(() => removeToast(tid), 6000);
        });
      }

      setNotifications(data);
    } catch {
      // Network errors are non-critical; just skip
    }
  }, [user, removeToast]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setToasts([]);
      seenIds.current = new Set();
      initialLoad.current = true;
      return;
    }
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{ unreadCount, notifications, refetch: fetchNotifications }}
    >
      {children}

      {/* Toast notifications — bottom-right overlay */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[200] flex flex-col gap-3 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 w-80 notification-toast"
          >
            <span className="text-2xl shrink-0">
              {TYPE_ICON[toast.type] ?? "🔔"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-snug">
                {toast.title}
              </p>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-700 text-xl leading-none shrink-0 mt-0.5"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
