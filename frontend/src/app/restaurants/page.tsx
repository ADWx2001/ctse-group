"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { restaurantApi, type Restaurant } from "@/lib/api";

export default function RestaurantsPage() {
  return (
    <Suspense fallback={<RestaurantsLoading />}>
      <RestaurantsContent />
    </Suspense>
  );
}

function RestaurantsLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="skeleton h-8 w-48 rounded mb-2" />
        <div className="skeleton h-5 w-64 rounded" />
      </div>
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
    </div>
  );
}

function RestaurantsContent() {
  const searchParams = useSearchParams();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cuisineFilter, setCuisineFilter] = useState(
    searchParams.get("cuisine") || "",
  );
  const [cityFilter, setCityFilter] = useState("");

  useEffect(() => {
    setLoading(true);
    restaurantApi
      .list({
        cuisine_type: cuisineFilter || undefined,
        city: cityFilter || undefined,
      })
      .then(setRestaurants)
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, [cuisineFilter, cityFilter]);

  const filtered = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisine_type?.toLowerCase().includes(search.toLowerCase()) ||
      r.city?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Restaurants</h1>
        <p className="text-gray-500">Find the best restaurants near you</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search restaurants, cuisines..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none transition"
          />
        </div>
        <select
          value={cuisineFilter}
          onChange={(e) => setCuisineFilter(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-full bg-white focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none transition"
        >
          <option value="">All Cuisines</option>
          {[
            "Pizza",
            "Burgers",
            "Sushi",
            "Chinese",
            "Indian",
            "Sri Lankan",
            "Italian",
            "Dessert",
            "Thai",
            "Mexican",
          ].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          placeholder="Filter by city..."
          className="px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-[#06C167] focus:border-transparent outline-none transition"
        />
      </div>

      {/* Active Filters */}
      {(cuisineFilter || cityFilter) && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-gray-500">Active filters:</span>
          {cuisineFilter && (
            <button
              onClick={() => setCuisineFilter("")}
              className="bg-gray-100 text-sm px-3 py-1 rounded-full flex items-center gap-1 hover:bg-gray-200"
            >
              {cuisineFilter} <span className="text-gray-400">✕</span>
            </button>
          )}
          {cityFilter && (
            <button
              onClick={() => setCityFilter("")}
              className="bg-gray-100 text-sm px-3 py-1 rounded-full flex items-center gap-1 hover:bg-gray-200"
            >
              {cityFilter} <span className="text-gray-400">✕</span>
            </button>
          )}
        </div>
      )}

      {/* Results */}
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
      ) : filtered.length > 0 ? (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {filtered.length} restaurant{filtered.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((r) => (
              <Link
                key={r.id}
                href={`/restaurants/${r.id}`}
                className="group rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition border border-gray-100"
              >
                <div className="h-48 bg-gray-200 relative overflow-hidden">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt={r.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-6xl">
                      🍽️
                    </div>
                  )}
                  {r.rating > 0 && (
                    <div className="absolute top-3 left-3 bg-white rounded-full px-2 py-1 text-xs font-bold shadow flex items-center gap-1">
                      ⭐ {r.rating.toFixed(1)}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-base group-hover:text-[#06C167] transition">
                    {r.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-gray-500 text-sm">
                    {r.cuisine_type && <span>{r.cuisine_type}</span>}
                    {r.cuisine_type && r.city && <span>·</span>}
                    {r.city && <span>{r.city}</span>}
                  </div>
                  {r.opening_hours && (
                    <p className="text-gray-400 text-xs mt-2">
                      🕐 {r.opening_hours}
                    </p>
                  )}
                  {r.description && (
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                      {r.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <p className="text-5xl mb-4">🔍</p>
          <p className="text-lg font-medium">No restaurants found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}
