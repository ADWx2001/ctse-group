"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-white font-bold text-xl tracking-tight"
          >
            <span className="bg-[#06C167] rounded-full w-8 h-8 flex items-center justify-center text-sm">
              🍔
            </span>
            <span>
              Food<span className="text-[#06C167]">Order</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/restaurants"
              className="text-gray-300 hover:text-white transition text-sm font-medium"
            >
              Restaurants
            </Link>

            {user ? (
              <>
                <Link
                  href="/orders"
                  className="text-gray-300 hover:text-white transition text-sm font-medium"
                >
                  Orders
                </Link>
                <Link
                  href="/notifications"
                  className="text-gray-300 hover:text-white transition text-sm font-medium"
                >
                  Notifications
                </Link>
                <Link
                  href="/cart"
                  className="relative text-gray-300 hover:text-white transition text-sm font-medium"
                >
                  Cart
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-4 bg-[#06C167] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {totalItems}
                    </span>
                  )}
                </Link>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 text-gray-300 hover:text-white transition text-sm font-medium"
                  >
                    <span className="bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-white text-xs uppercase">
                      {user.name.charAt(0)}
                    </span>
                    <span className="hidden lg:inline">{user.name}</span>
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-50">
                      <Link
                        href="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      {user.role === "restaurant_owner" && (
                        <Link
                          href="/my-restaurant"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setMenuOpen(false)}
                        >
                          My Restaurant
                        </Link>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          setMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-gray-800 transition"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="bg-white text-black text-sm font-medium px-4 py-2 rounded-full hover:bg-gray-200 transition"
                >
                  Sign up
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-800 py-4 space-y-2">
            <Link
              href="/restaurants"
              className="block text-gray-300 hover:text-white py-2 text-sm"
              onClick={() => setMenuOpen(false)}
            >
              Restaurants
            </Link>
            {user ? (
              <>
                <Link
                  href="/orders"
                  className="block text-gray-300 hover:text-white py-2 text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  Orders
                </Link>
                <Link
                  href="/notifications"
                  className="block text-gray-300 hover:text-white py-2 text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  Notifications
                </Link>
                <Link
                  href="/cart"
                  className="block text-gray-300 hover:text-white py-2 text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  Cart {totalItems > 0 && `(${totalItems})`}
                </Link>
                <Link
                  href="/profile"
                  className="block text-gray-300 hover:text-white py-2 text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="block text-red-400 py-2 text-sm"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-gray-300 hover:text-white py-2 text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="block text-gray-300 hover:text-white py-2 text-sm"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
