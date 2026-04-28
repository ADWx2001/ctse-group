const API_URLS = {
  user: process.env.NEXT_PUBLIC_USER_SERVICE_URL || "http://localhost:3001",
  restaurant:
    process.env.NEXT_PUBLIC_RESTAURANT_SERVICE_URL || "http://localhost:3002",
  order: process.env.NEXT_PUBLIC_ORDER_SERVICE_URL || "http://localhost:3003",
  notification:
    process.env.NEXT_PUBLIC_NOTIFICATION_SERVICE_URL || "http://localhost:3004",
};

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || body.detail || res.statusText, res.status);
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ─── Auth ──────────────────────────────────────────────────────────────
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: "customer" | "restaurant_owner";
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  isActive: boolean;
  createdAt: string;
}

export const authApi = {
  register: (data: RegisterPayload) =>
    request<AuthResponse>(`${API_URLS.user}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: LoginPayload) =>
    request<AuthResponse>(`${API_URLS.user}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  validate: () =>
    request<{ valid: boolean; user: User }>(
      `${API_URLS.user}/api/auth/validate`,
    ),
};

// ─── User Profile ──────────────────────────────────────────────────────
export const userApi = {
  getProfile: () =>
    request<{ user: User }>(`${API_URLS.user}/api/users/profile`),

  updateProfile: (data: Partial<User>) =>
    request<{ message: string; user: User }>(
      `${API_URLS.user}/api/users/profile`,
      { method: "PUT", body: JSON.stringify(data) },
    ),

  deleteProfile: () =>
    request<{ message: string }>(`${API_URLS.user}/api/users/profile`, {
      method: "DELETE",
    }),
};

// ─── Restaurants ───────────────────────────────────────────────────────
export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  cuisine_type?: string;
  image_url?: string;
  opening_hours?: string;
  is_active: boolean;
  owner_id: string;
  rating: number;
  created_at?: string;
  updated_at?: string;
}

export interface RestaurantWithMenu extends Restaurant {
  menu_items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  is_available: boolean;
  image_url?: string;
  preparation_time: number;
  restaurant_id: string;
  created_at?: string;
  updated_at?: string;
}

export const restaurantApi = {
  list: (params?: { city?: string; cuisine_type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.city) qs.set("city", params.city);
    if (params?.cuisine_type) qs.set("cuisine_type", params.cuisine_type);
    const query = qs.toString();
    return request<Restaurant[]>(
      `${API_URLS.restaurant}/api/restaurants${query ? `?${query}` : ""}`,
    );
  },

  get: (id: string) =>
    request<RestaurantWithMenu>(`${API_URLS.restaurant}/api/restaurants/${id}`),

  create: (
    data: Omit<
      Restaurant,
      "id" | "is_active" | "owner_id" | "rating" | "created_at" | "updated_at"
    >,
  ) =>
    request<Restaurant>(`${API_URLS.restaurant}/api/restaurants`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getMenu: (restaurantId: string) =>
    request<MenuItem[]>(
      `${API_URLS.restaurant}/api/menu/restaurant/${restaurantId}`,
    ),

  addMenuItem: (
    restaurantId: string,
    data: Omit<MenuItem, "id" | "restaurant_id" | "created_at" | "updated_at">,
  ) =>
    request<MenuItem>(
      `${API_URLS.restaurant}/api/menu/restaurant/${restaurantId}`,
      { method: "POST", body: JSON.stringify(data) },
    ),

  uploadMenuItemImage: async (itemId: string, file: File): Promise<MenuItem> => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
      `${API_URLS.restaurant}/api/menu/${itemId}/image`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(body.error || body.detail || res.statusText, res.status);
    }
    return res.json();
  },
};

// ─── Orders ────────────────────────────────────────────────────────────
export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  _id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  totalAmount: number;
  status: string;
  statusHistory: { status: string; updatedAt: string; note?: string }[];
  deliveryAddress: {
    street: string;
    city: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  specialInstructions?: string;
  estimatedDeliveryTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  restaurantId: string;
  items: { menuItemId: string; quantity: number }[];
  deliveryAddress: {
    street: string;
    city: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  specialInstructions?: string;
}

export const orderApi = {
  create: (data: CreateOrderPayload) =>
    request<{ message: string; order: Order }>(`${API_URLS.order}/api/orders`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: (page = 1, limit = 10) =>
    request<{
      orders: Order[];
      pagination: { total: number; page: number; pages: number; limit: number };
    }>(`${API_URLS.order}/api/orders?page=${page}&limit=${limit}`),

  listByRestaurant: (restaurantId: string, page = 1, limit = 20) =>
    request<{
      orders: Order[];
      pagination: { total: number; page: number; pages: number; limit: number };
    }>(
      `${API_URLS.order}/api/orders?restaurantId=${restaurantId}&page=${page}&limit=${limit}`,
    ),

  get: (id: string) =>
    request<{ order: Order }>(`${API_URLS.order}/api/orders/${id}`),

  updateStatus: (id: string, status: string) =>
    request<{ message: string; order: Order }>(
      `${API_URLS.order}/api/orders/${id}/status`,
      { method: "PUT", body: JSON.stringify({ status }) },
    ),

  cancel: (id: string) =>
    request<{ message: string }>(`${API_URLS.order}/api/orders/${id}`, {
      method: "DELETE",
    }),
};

// ─── Notifications ─────────────────────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  user_email?: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  is_email_sent: boolean;
  order_id?: string;
  created_at: string;
}

export const notificationApi = {
  list: (userId: string, unreadOnly = false) =>
    request<Notification[]>(
      `${API_URLS.notification}/api/notifications/user/${userId}${unreadOnly ? "?unread_only=true" : ""}`,
    ),

  markRead: (notificationId: string) =>
    request<Notification>(
      `${API_URLS.notification}/api/notifications/${notificationId}/read`,
      { method: "PUT", body: JSON.stringify({ is_read: true }) },
    ),
};
