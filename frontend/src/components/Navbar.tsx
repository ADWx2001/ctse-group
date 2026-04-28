"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useNotifications } from "@/context/NotificationContext";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalItems } = useCart();
  const { unreadCount } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);

  // Log user role for debugging
  console.log("Logged in user role:", user?.role);

  const isOwner = user?.role === "restaurant_owner";
  const isAdmin = user?.role === "admin";

  return (
    <header className="bg-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href={isOwner ? "/owner/dashboard" : "/"}
            className="flex items-center gap-2 text-white font-bold text-xl tracking-tight"
          >
            <span className="bg-[#06C167] rounded-full w-8 h-8 flex items-center justify-center text-sm">
              🍔
            </span>
            <span>
              SLIIT Food<span className="text-[#06C167]">Delivery Systemm</span>
              {isOwner && (
                <span className="ml-2 text-xs font-normal text-[#06C167] border border-[#06C167] rounded-full px-2 py-0.5">
                  Owner
                </span>
              )}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {/* Owner links */}
            {user && isOwner && (
              <>
                <Link
                  href="/owner/dashboard"
                  className="text-gray-300 hover:text-white transition text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/my-restaurant"
                  className="text-gray-300 hover:text-white transition text-sm font-medium"
                >
                  My Restaurant
                </Link>
                <Link
                  href="/owner/orders"
                  className="text-gray-300 hover:text-white transition text-sm font-medium"
                >
                  Incoming Orders
                </Link>
                <Link
                  href="/notifications"
                  className="relative text-gray-300 hover:text-white transition text-sm font-medium"
                >
                  Notifications
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-4 bg-[#06C167] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* Customer / guest links */}
            {(!user || (!isOwner && !isAdmin)) && (
              <>
                <Link
                  href="/restaurants"
                  className="text-gray-300 hover:text-white transition text-sm font-medium"
                >
                  Restaurants
                </Link>
                {user && (
                  <>
                    <Link
                      href="/orders"
                      className="text-gray-300 hover:text-white transition text-sm font-medium"
                    >
                      Orders
                    </Link>
                    <Link
                      href="/notifications"
                      className="relative text-gray-300 hover:text-white transition text-sm font-medium"
                    >
                      Notifications
                      {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-4 bg-[#06C167] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
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
                  </>
                )}
              </>
            )}

            {/* User dropdown */}
            {user ? (
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
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {isOwner
                          ? "Restaurant Owner"
                          : isAdmin
                            ? "Admin"
                            : "Customer"}
                      </p>
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {user.name}
                      </p>
                    </div>
                    {isOwner && (
                      <>
                        <Link
                          href="/owner/dashboard"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setMenuOpen(false)}
                        >
                          Dashboard
                        </Link>
                        <Link
                          href="/my-restaurant"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setMenuOpen(false)}
                        >
                          My Restaurant
                        </Link>
                        <Link
                          href="/owner/orders"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setMenuOpen(false)}
                        >
                          Incoming Orders
                        </Link>
                      </>
                    )}
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <div className="border-t border-gray-100 mt-1 pt-1">
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
                  </div>
                )}
              </div>
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

          {/* Mobile menu toggle */}
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
          <div className="md:hidden border-t border-gray-800 py-4 space-y-1">
            {user && isOwner ? (
              <>
                <Link
                  href="/owner/dashboard"
                  className="block text-gray-300 hover:text-white py-2 text-sm px-2 rounded"
                  onClick={() => setMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/my-restaurant"
                  className="block text-gray-300 hover:text-white py-2 text-sm px-2 rounded"
                  onClick={() => setMenuOpen(false)}
                >
                  My Restaurant
                </Link>
                <Link
                  href="/owner/orders"
                  className="block text-gray-300 hover:text-white py-2 text-sm px-2 rounded"
                  onClick={() => setMenuOpen(false)}
                >
                  Incoming Orders
                </Link>
                <Link
                  href="/notifications"
                  className="flex items-center gap-2 text-gray-300 hover:text-white py-2 text-sm px-2 rounded"
                  onClick={() => setMenuOpen(false)}
                >
                  Notifications
                  {unreadCount > 0 && (
                    <span className="bg-[#06C167] text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/restaurants"
                  className="block text-gray-300 hover:text-white py-2 text-sm px-2 rounded"
                  onClick={() => setMenuOpen(false)}
                >
                  Restaurants
                </Link>
                {user && (
                  <>
                    <Link
                      href="/orders"
                      className="block text-gray-300 hover:text-white py-2 text-sm px-2 rounded"
                      onClick={() => setMenuOpen(false)}
                    >
                      Orders
                    </Link>
                    <Link
                      href="/notifications"
                      className="flex items-center gap-2 text-gray-300 hover:text-white py-2 text-sm px-2 rounded"
                      onClick={() => setMenuOpen(false)}
                    >
                      Notifications
                      {unreadCount > 0 && (
                        <span className="bg-[#06C167] text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/cart"
                      className="block text-gray-300 hover:text-white py-2 text-sm px-2 rounded"
                      onClick={() => setMenuOpen(false)}
                    >
                      Cart {totalItems > 0 && `(${totalItems})`}
                    </Link>
                  </>
                )}
              </>
            )}
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="block text-gray-300 hover:text-white py-2 text-sm px-2 rounded"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="block text-red-400 py-2 text-sm px-2"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-gray-300 hover:text-white py-2 text-sm px-2 rounded"
                  onClick={() => setMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="block text-gray-300 hover:text-white py-2 text-sm px-2 rounded"
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
