"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { restaurantApi, type Restaurant } from "@/lib/api";

const CUISINES = [
  { name: "Pizza", emoji: "🍕" },
  { name: "Burgers", emoji: "🍔" },
  { name: "Sushi", emoji: "🍣" },
  { name: "Chinese", emoji: "🥡" },
  { name: "Indian", emoji: "🍛" },
  { name: "Sri Lankan", emoji: "🍚" },
  { name: "Italian", emoji: "🍝" },
  { name: "Dessert", emoji: "🍰" },
];

export default function HomePage() {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restaurantApi
      .list()
      .then(setRestaurants)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-4">
              Order food to your door
            </h1>
            <p className="text-gray-400 text-lg md:text-xl mb-8">
              Browse restaurants, pick your favorites, and get them delivered
              fast.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/restaurants"
                className="bg-[#06C167] hover:bg-[#05a758] text-white font-semibold px-8 py-3 rounded-full text-center transition"
              >
                Find Restaurants
              </Link>
              {!user && (
                <Link
                  href="/register"
                  className="bg-white text-black font-semibold px-8 py-3 rounded-full text-center hover:bg-gray-200 transition"
                >
                  Create Account
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Cuisine Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold mb-6">Explore by Cuisine</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {CUISINES.map((c) => (
            <Link
              key={c.name}
              href={`/restaurants?cuisine=${encodeURIComponent(c.name)}`}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl hover:bg-gray-100 transition group"
            >
              <span className="text-4xl group-hover:scale-110 transition-transform">
                {c.emoji}
              </span>
              <span className="text-xs font-medium text-gray-700">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Popular Restaurants</h2>
          <Link
            href="/restaurants"
            className="text-[#06C167] hover:underline font-medium text-sm"
          >
            View all →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="skeleton h-48 w-full" />
                <div className="p-4 space-y-2">
                  <div className="skeleton h-5 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/2 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : restaurants.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.slice(0, 6).map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <p className="text-5xl mb-4">🍽️</p>
            <p className="text-lg font-medium">No restaurants available yet</p>
            <p className="text-sm mt-1">Check back soon!</p>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Browse Restaurants",
                desc: "Explore menus from your favorite local restaurants.",
                icon: "🔍",
              },
              {
                step: "2",
                title: "Place Your Order",
                desc: "Add items to your cart and checkout securely.",
                icon: "🛒",
              },
              {
                step: "3",
                title: "Fast Delivery",
                desc: "Track your order in real-time until it arrives.",
                icon: "🚀",
              },
            ].map((s) => (
              <div
                key={s.step}
                className="text-center bg-white rounded-2xl p-8 shadow-sm"
              >
                <div className="text-5xl mb-4">{s.icon}</div>
                <h3 className="font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="group rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition"
    >
      <div className="h-48 bg-gray-200 relative overflow-hidden">
        {restaurant.image_url ? (
          <img
            src={restaurant.image_url}
            alt={restaurant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-6xl">
            🍽️
          </div>
        )}
        {restaurant.rating > 0 && (
          <div className="absolute top-3 left-3 bg-white rounded-full px-2 py-1 text-xs font-bold shadow flex items-center gap-1">
            ⭐ {restaurant.rating.toFixed(1)}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-base group-hover:text-[#06C167] transition">
          {restaurant.name}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-gray-500 text-sm">
          {restaurant.cuisine_type && <span>{restaurant.cuisine_type}</span>}
          {restaurant.cuisine_type && restaurant.city && <span>·</span>}
          {restaurant.city && <span>{restaurant.city}</span>}
        </div>
        {restaurant.description && (
          <p className="text-gray-400 text-xs mt-2 line-clamp-2">
            {restaurant.description}
          </p>
        )}
      </div>
    </Link>
  );
}
