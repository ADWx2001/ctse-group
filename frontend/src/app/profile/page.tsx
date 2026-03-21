"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { userApi, ApiError } from "@/lib/api";

export default function ProfilePage() {
  const { user, loading: authLoading, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    setForm({
      name: user.name || "",
      phone: user.phone || "",
      street: user.address?.street || "",
      city: user.address?.city || "",
      state: user.address?.state || "",
      zipCode: user.address?.zipCode || "",
    });
  }, [user, authLoading, router]);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await userApi.updateProfile({
        name: form.name,
        phone: form.phone || undefined,
        address: {
          street: form.street,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
        },
      } as Parameters<typeof userApi.updateProfile>[0]);
      await refreshProfile();
      setEditing(false);
      setSuccess("Profile updated successfully");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (
      !confirm(
        "Are you sure you want to deactivate your account? This action cannot be easily undone.",
      )
    )
      return;
    try {
      await userApi.deleteProfile();
      logout();
      router.push("/");
    } catch {
      alert("Failed to deactivate account");
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Profile</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 text-sm">
          {success}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        {/* Avatar & role */}
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center text-2xl font-bold">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="font-bold text-lg">{user.name}</h2>
            <p className="text-gray-500 text-sm">{user.email}</p>
            <span className="inline-block mt-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs capitalize">
              {user.role.replace("_", " ")}
            </span>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
                placeholder="+94771234567"
              />
            </div>

            <h3 className="font-bold text-sm pt-2">Address</h3>
            <input
              type="text"
              placeholder="Street"
              value={form.street}
              onChange={(e) =>
                setForm((f) => ({ ...f, street: e.target.value }))
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
            />
            <div className="grid grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="City"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
              />
              <input
                type="text"
                placeholder="State"
                value={form.state}
                onChange={(e) =>
                  setForm((f) => ({ ...f, state: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
              />
              <input
                type="text"
                placeholder="ZIP"
                value={form.zipCode}
                onChange={(e) =>
                  setForm((f) => ({ ...f, zipCode: e.target.value }))
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#06C167] text-white font-medium px-6 py-2 rounded-xl hover:bg-[#05a758] transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="border border-gray-300 text-gray-700 font-medium px-6 py-2 rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Phone</p>
                <p className="text-sm font-medium">{user.phone || "Not set"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Member since</p>
                <p className="text-sm font-medium">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
            </div>

            {user.address && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Address</p>
                <p className="text-sm font-medium">
                  {[
                    user.address.street,
                    user.address.city,
                    user.address.state,
                    user.address.zipCode,
                  ]
                    .filter(Boolean)
                    .join(", ") || "Not set"}
                </p>
              </div>
            )}

            <button
              onClick={() => setEditing(true)}
              className="bg-black text-white font-medium px-6 py-2 rounded-xl hover:bg-gray-800 transition"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="border border-red-200 rounded-2xl p-6">
        <h3 className="font-bold text-red-600 mb-2">Danger Zone</h3>
        <p className="text-gray-500 text-sm mb-4">
          Deactivating your account will prevent you from logging in and placing
          orders.
        </p>
        <button
          onClick={handleDeactivate}
          className="border-2 border-red-500 text-red-500 font-medium px-6 py-2 rounded-xl hover:bg-red-50 transition"
        >
          Deactivate Account
        </button>
      </div>
    </div>
  );
}
