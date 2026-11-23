import React, { useState, useEffect } from "react";
import orderService from "../../services/orderService";
import { Package, Truck, CheckCircle2, Clock, AlertCircle, Phone, MapPin, Search, Filter } from "lucide-react";
import io from "socket.io-client";

export default function FarmerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const fetchFarmerOrders = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const data = await orderService.getFarmerOrders(token);
      setOrders(data);
    } catch (err) {
      console.error("Failed to load farmer orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmerOrders();

    // Socket.io for live order notifications
    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    const token = localStorage.getItem("token");
    const socket = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    socket.on("new_order", () => {
      fetchFarmerOrders();
    });

    socket.on("order_status_updated", () => {
      fetchFarmerOrders();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      const token = localStorage.getItem("token");
      await orderService.updateOrderStatus(orderId, { status: newStatus }, token);
      setOrders(prev =>
        prev.map(o => (o._id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update order status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch =
      order.trackingId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shippingAddress?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items?.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Calculate Stats
  const totalRevenue = orders
    .filter(o => o.status !== "cancelled")
    .reduce((sum, o) => sum + (o.subtotal || o.totalAmount || 0), 0);
  const pendingCount = orders.filter(o => o.status === "pending" || o.status === "processing").length;
  const deliveredCount = orders.filter(o => o.status === "delivered" || o.status === "completed").length;

  const getStatusBadge = (status) => {
    switch (status) {
      case "delivered":
      case "completed":
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Delivered</span>;
      case "shipped":
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Shipped</span>;
      case "processing":
        return <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Processing</span>;
      case "pending":
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Pending</span>;
      case "cancelled":
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-wider">Cancelled</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold uppercase">{status}</span>;
    }
  };

  return (
    <div className="p-6 md:p-8 font-sans max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8 text-green-600" />
            Produce Orders & Fulfillment
          </h1>
          <p className="text-gray-600 text-sm mt-1">Manage incoming consumer harvest orders, dispatch shipments, and track farm sales.</p>
        </div>
        <button
          onClick={fetchFarmerOrders}
          className="self-start md:self-auto px-4 py-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 font-bold rounded-xl text-sm transition-all"
        >
          ↻ Refresh Orders
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Orders</p>
          <h3 className="text-3xl font-black text-gray-900 mt-2">{orders.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Action Required</p>
          <h3 className="text-3xl font-black text-amber-600 mt-2">{pendingCount}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Delivered</p>
          <h3 className="text-3xl font-black text-green-700 mt-2">{deliveredCount}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Gross Produce Sales</p>
          <h3 className="text-3xl font-black text-blue-700 mt-2">₹{totalRevenue.toLocaleString()}</h3>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
        <div className="relative w-full md:w-80">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by ID, customer, item, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {["all", "pending", "processing", "shipped", "delivered", "cancelled"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                statusFilter === tab
                  ? "bg-green-700 text-white shadow"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Order List */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading harvest orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-800">No orders found</h3>
          <p className="text-gray-500 text-sm mt-1">There are no incoming orders matching this filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:border-green-300 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-base text-gray-900">{order.trackingId || order._id}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Payment: <strong className="uppercase">{order.paymentMethod}</strong> ({order.paymentStatus})
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {order.status === "pending" && (
                    <button
                      disabled={updatingId === order._id}
                      onClick={() => handleUpdateStatus(order._id, "processing")}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                    >
                      {updatingId === order._id ? "Updating..." : "Accept & Prepare Harvest"}
                    </button>
                  )}
                  {order.status === "processing" && (
                    <button
                      disabled={updatingId === order._id}
                      onClick={() => handleUpdateStatus(order._id, "shipped")}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      {updatingId === order._id ? "Updating..." : "Mark Dispatched"}
                    </button>
                  )}
                  {order.status === "shipped" && (
                    <button
                      disabled={updatingId === order._id}
                      onClick={() => handleUpdateStatus(order._id, "delivered")}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {updatingId === order._id ? "Updating..." : "Mark Delivered"}
                    </button>
                  )}
                </div>
              </div>

              {/* Order Body */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Customer Details */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customer & Delivery</h4>
                  <p className="text-sm font-bold text-gray-900">{order.buyer?.name || order.shippingAddress?.name || "Customer"}</p>
                  <p className="text-xs text-gray-600 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    {order.buyer?.phone || order.shippingAddress?.phone || "No phone provided"}
                  </p>
                  <p className="text-xs text-gray-600 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                    <span>{order.shippingAddress?.address}, {order.shippingAddress?.city} - {order.shippingAddress?.pincode}</span>
                  </p>
                </div>

                {/* Items */}
                <div className="md:col-span-2">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Produce Items</h4>
                  <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-600"></span>
                          <span className="font-semibold text-gray-800">{item.name}</span>
                          <span className="text-gray-500 text-xs">({item.quantity} {item.unit || "kg"} @ ₹{item.price})</span>
                        </div>
                        <span className="font-bold text-gray-900">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-200 flex justify-between text-xs font-bold text-gray-700">
                      <span>Order Total:</span>
                      <span className="text-sm font-black text-green-700">₹{order.totalAmount}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
