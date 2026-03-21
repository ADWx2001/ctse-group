export default function Footer() {
  return (
    <footer className="bg-black text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">
              Food<span className="text-[#06C167]">Order</span>
            </h3>
            <p className="text-sm">
              Delicious food delivered to your doorstep from your favorite local
              restaurants.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/restaurants" className="hover:text-white transition">
                  Restaurants
                </a>
              </li>
              <li>
                <a href="/orders" className="hover:text-white transition">
                  My Orders
                </a>
              </li>
              <li>
                <a href="/profile" className="hover:text-white transition">
                  My Account
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="hover:text-white transition cursor-default">
                  Help Center
                </span>
              </li>
              <li>
                <span className="hover:text-white transition cursor-default">
                  Safety
                </span>
              </li>
              <li>
                <span className="hover:text-white transition cursor-default">
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li>Colombo, Sri Lanka</li>
              <li>contact@foodorder.lk</li>
              <li>+94 11 234 5678</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center">
          &copy; {new Date().getFullYear()} FoodOrder — CTSE Cloud Computing
          Project
        </div>
      </div>
    </footer>
  );
}
