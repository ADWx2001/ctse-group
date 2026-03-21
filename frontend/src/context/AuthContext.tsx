"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authApi, userApi, type User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    phone?: string,
    role?: "customer" | "restaurant_owner",
  ) => Promise<User>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const saveAuth = (token: string, user: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setToken(token);
    setUser(user);
  };

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const { user } = await userApi.getProfile();
      setUser(user);
      localStorage.setItem("user", JSON.stringify(user));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      // Validate token in background
      authApi.validate().catch(() => {
        logout();
      });
    }
    setLoading(false);
  }, [logout]);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await authApi.login({ email, password });
    saveAuth(res.token, res.user);
    return res.user;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    phone?: string,
    role?: "customer" | "restaurant_owner",
  ): Promise<User> => {
    const res = await authApi.register({ name, email, password, phone, role });
    saveAuth(res.token, res.user);
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
