import React from "react";
import { Link } from "react-router-dom";
import { Leaf, Shield, Truck, Heart, ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#0b1c2d] text-slate-300 font-sans border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-white font-black text-2xl tracking-tight">
              <span className="p-1.5 bg-emerald-600 rounded-xl">🌱</span>
              TerraFresh
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Empowering farmers through direct fair trade, transparent pricing, and real-time live auction bidding.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
              <Shield className="w-4 h-4" /> 100% Verified Farm Direct
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Marketplace</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/consumer/vegetables" className="hover:text-emerald-400 transition-colors">Vegetables</Link></li>
              <li><Link to="/consumer/fruits" className="hover:text-emerald-400 transition-colors">Fresh Fruits</Link></li>
              <li><Link to="/consumer/grains" className="hover:text-emerald-400 transition-colors">Grains & Cereals</Link></li>
              <li><Link to="/consumer/dairy" className="hover:text-emerald-400 transition-colors">Farm Dairy</Link></li>
              <li><Link to="/consumer/organic" className="hover:text-emerald-400 transition-colors">Certified Organic</Link></li>
            </ul>
          </div>

          {/* Auctions & Trade */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Farmer Trade</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/consumer/auctions" className="hover:text-emerald-400 transition-colors">Live Auctions</Link></li>
              <li><Link to="/farmer/products" className="hover:text-emerald-400 transition-colors">Produce Listings</Link></li>
              <li><Link to="/farmer/orders" className="hover:text-emerald-400 transition-colors">Fulfillment Portal</Link></li>
              <li><Link to="/farmer/verification" className="hover:text-emerald-400 transition-colors">Farmer KYC</Link></li>
            </ul>
          </div>

          {/* Trust Badges */}
          <div>
            <h4 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Platform Security</h4>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Harvest-to-Doorstep delivery in climate-safe vehicles</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>Encrypted payment processing & verified farmer escrow</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} TerraFresh Digital Farmers Market. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Built with <Heart className="w-3.5 h-3.5 text-red-500 fill-current" /> for sustainable agriculture
          </p>
        </div>
      </div>
    </footer>
  );
}
