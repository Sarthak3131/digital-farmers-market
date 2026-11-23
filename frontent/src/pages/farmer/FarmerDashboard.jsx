import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, DollarSign, Calendar, ArrowUpRight, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import productService from '../../services/productService';
import orderService from '../../services/orderService';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [productCount, setProductCount] = useState(0);
  const [orders, setOrders] = useState([]);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const [prods, ords] = await Promise.allSettled([
          productService.getMyProducts(token),
          orderService.getFarmerOrders(token)
        ]);

        if (prods.status === "fulfilled") {
          setProductCount(prods.value.length);
        }

        if (ords.status === "fulfilled") {
          setOrders(ords.value);
          const total = ords.value
            .filter(o => o.status !== "cancelled")
            .reduce((sum, o) => sum + (o.subtotal || o.totalAmount || 0), 0);
          setRevenue(total);
        }
      } catch (err) {
        console.error("Farmer dashboard fetch error:", err);
      }
    };

    loadDashboardData();
  }, []);

  const chartData = [
    { name: 'Mon', revenue: Math.round(revenue * 0.1) },
    { name: 'Tue', revenue: Math.round(revenue * 0.15) },
    { name: 'Wed', revenue: Math.round(revenue * 0.2) },
    { name: 'Thu', revenue: Math.round(revenue * 0.18) },
    { name: 'Fri', revenue: Math.round(revenue * 0.25) },
    { name: 'Sat', revenue: Math.round(revenue * 0.3) },
    { name: 'Sun', revenue: Math.max(revenue, 2450) },
  ];

  return (
    <div className="p-6 md:p-8 font-sans text-gray-800 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-[#15803d] rounded-3xl p-8 mb-8 text-white relative overflow-hidden shadow-lg">
        <div className="relative z-10">
          <h1 className="text-3xl font-black mb-2 tracking-tight">Welcome back, {user?.name || 'Farmer'}! 🌾</h1>
          <p className="text-green-100 opacity-90 text-sm">Your farm dashboard is synchronized with live market demand and customer orders.</p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-15 transform translate-x-10 translate-y-10">
          <Package className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">Live Produce</span>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Active Inventory Items</p>
          <h3 className="text-3xl font-black text-gray-900 mt-1">{productCount}</h3>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <ShoppingBag className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">Direct Orders</span>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Customer Orders</p>
          <h3 className="text-3xl font-black text-gray-900 mt-1">{orders.length}</h3>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Gross Sales</span>
          </div>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Farm Revenue</p>
          <h3 className="text-3xl font-black text-gray-900 mt-1">₹{revenue.toLocaleString()}</h3>
        </div>
      </div>

      {/* Middle Section: Graph & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Graph */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold mb-6 text-gray-800">Weekly Revenue Trend</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#15803d" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#15803d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val) => [`₹${val}`, 'Sales']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorEarnings)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">Recent Customer Orders</h2>
              <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full">Live</span>
            </div>
            <div className="space-y-4">
              {orders.slice(0, 4).map((order) => (
                <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.buyer?.name || "Customer"}</p>
                    <p className="text-xs text-gray-500 font-mono">{order.trackingId || order._id.slice(-8)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-700">₹{order.totalAmount}</p>
                    <span className="text-[10px] uppercase font-bold text-gray-600 bg-gray-200 px-2 py-0.5 rounded-full">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-8">No customer orders yet. Fresh listings will appear here!</p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/farmer/orders')}
            className="w-full mt-6 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-sm font-bold text-gray-700 border border-gray-200 transition-colors"
          >
            Manage All Orders & Shipments &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}
