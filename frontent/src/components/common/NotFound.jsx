import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Gavel, ShoppingBag, Compass } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] bg-emerald-500/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-blue-500/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-lg w-full bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-8 sm:p-10 shadow-2xl text-center relative z-10">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
          <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: "12s" }} />
        </div>

        <span className="text-emerald-400 text-xs font-black tracking-widest uppercase bg-emerald-950/70 border border-emerald-800/60 px-3 py-1 rounded-full">
          404 Not Found
        </span>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-4 mb-2">
          Lost in the Field?
        </h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          The crop page or marketplace route you are looking for has been harvested or does not exist.
        </p>

        <div className="space-y-3 mb-8 text-left">
          <Link
            to="/consumer/home"
            className="flex items-center justify-between p-3.5 bg-slate-700/50 hover:bg-slate-700 rounded-2xl border border-slate-600/50 transition-all text-sm group"
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              <div>
                <span className="font-bold text-slate-100">Marketplace Produce</span>
                <p className="text-xs text-slate-400">Explore fresh fruits, vegetables & grains</p>
              </div>
            </div>
            <span className="text-xs text-emerald-400 group-hover:translate-x-1 transition-transform">&rarr;</span>
          </Link>

          <Link
            to="/consumer/auctions"
            className="flex items-center justify-between p-3.5 bg-slate-700/50 hover:bg-slate-700 rounded-2xl border border-slate-600/50 transition-all text-sm group"
          >
            <div className="flex items-center gap-3">
              <Gavel className="w-5 h-5 text-amber-400" />
              <div>
                <span className="font-bold text-slate-100">Live Auctions</span>
                <p className="text-xs text-slate-400">Join active farmer bidding lots</p>
              </div>
            </div>
            <span className="text-xs text-amber-400 group-hover:translate-x-1 transition-transform">&rarr;</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <Link
            to="/"
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 text-white"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
