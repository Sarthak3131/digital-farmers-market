import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, DollarSign, Package, ArrowLeft, Download,
  BarChart2, ShieldCheck, Activity, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import adminService from '../../services/adminService';

export default function Analytics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [statsRes, revRes] = await Promise.allSettled([
          adminService.getStats(token),
          adminService.getRevenue(token)
        ]);

        if (statsRes.status === "fulfilled") setStats(statsRes.value);
        if (revRes.status === "fulfilled") setRevenueData(revRes.value);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  const chartData = revenueData?.chartData || stats?.revenueTrend || [];

  const categoryDistribution = [
    { name: 'Vegetables', volume: 45000, orders: 120 },
    { name: 'Fruits', volume: 38000, orders: 95 },
    { name: 'Grains', volume: 52000, orders: 40 },
    { name: 'Dairy', volume: 22000, orders: 85 },
    { name: 'Organic', volume: 31000, orders: 60 },
    { name: 'Spices', volume: 18000, orders: 75 }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="p-2.5 bg-[#1e293b] rounded-xl hover:bg-[#334155] transition-colors border border-slate-700"
          >
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
              <BarChart2 className="w-8 h-8 text-emerald-400" />
              Platform Analytics & Intelligence
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Macro insights into marketplace trade volume, revenue velocity, and producer growth.
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="self-start md:self-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold rounded-xl text-sm transition-all shadow-lg flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export Intelligence Brief
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-400" /> Gross Merchandise Volume
          </p>
          <h3 className="text-3xl font-black text-white mt-2">
            ₹{(revenueData?.totalVolume || stats?.totalGMV || 0).toLocaleString()}
          </h3>
          <p className="text-xs text-emerald-400 font-medium mt-1">+14.2% month over month</p>
        </div>

        <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" /> Platform Fee Revenue
          </p>
          <h3 className="text-3xl font-black text-emerald-400 mt-2">
            ₹{(revenueData?.totalRevenue || stats?.totalRevenue || 0).toLocaleString()}
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">2.5% platform commission</p>
        </div>

        <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" /> Verified Farmers
          </p>
          <h3 className="text-3xl font-black text-white mt-2">
            {stats?.activeFarmers || 0}
          </h3>
          <p className="text-xs text-amber-400 font-medium mt-1">
            {stats?.verificationQueue || 0} pending review
          </p>
        </div>

        <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Package className="w-4 h-4 text-amber-400" /> Active Produce Items
          </p>
          <h3 className="text-3xl font-black text-white mt-2">
            {stats?.totalProducts || 0}
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {stats?.liveAuctions || 0} active live auctions
          </p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Velocity Chart */}
        <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Daily Revenue Velocity</h3>
              <p className="text-xs text-slate-400">Platform fee aggregation over the past 7 days</p>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full">
              Live Feed
            </span>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  formatter={(val) => [`₹${val}`, 'Platform Fee']}
                />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fill="url(#analyticsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Volume Distribution */}
        <div className="bg-[#1e293b] border border-slate-800 p-6 rounded-2xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Category Trade Volume</h3>
              <p className="text-xs text-slate-400">Marketplace order distribution by agricultural category</p>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tickLine={false} />
                <YAxis stroke="#94a3b8" tickLine={false} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  formatter={(val) => [`₹${val.toLocaleString()}`, 'Volume']}
                />
                <Bar dataKey="volume" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
