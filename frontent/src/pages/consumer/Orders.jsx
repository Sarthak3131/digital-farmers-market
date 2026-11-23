import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Package,
  Truck,
  MapPin,
  RefreshCw,
  ChevronRight,
  Calendar,
  CreditCard,
  Download,
  MessageCircle,
  ExternalLink,
  X,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import SupportSection from '../../components/consumer/SupportSection';
import { generateInvoice } from '../../utils/invoiceGenerator';
import orderService from '../../services/orderService';
import io from 'socket.io-client';

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const data = await orderService.getMyOrders(token);
      const transformed = data.map(order => ({
        id: order._id,
        rawOrder: order,
        date: new Date(order.createdAt).toLocaleDateString(),
        time: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: order.status,
        subtotal: order.subtotal || order.totalAmount,
        tax: order.tax || 0,
        deliveryFee: order.deliveryFee || 0,
        platformFee: order.platformFee || 0,
        items: order.items.map((item, idx) => ({
          id: item.product?._id || item.product || idx,
          name: item.name,
          qty: item.quantity,
          price: item.price,
          unit: item.unit || "kg",
          image: item.image || item.product?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150',
        })),
        total: order.totalAmount,
        shippingAddress: order.shippingAddress,
        deliveryAddress: `${order.shippingAddress?.address || ''}, ${order.shippingAddress?.city || ''} ${order.shippingAddress?.pincode || ''}`,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        trackingId: order.trackingId || `TF-ORD-${order._id.slice(-6).toUpperCase()}`,
        estimatedDelivery: 'Within 24 Hours'
      }));

      setOrders(transformed);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    const socket = io(socketUrl);

    socket.on("order_status_updated", (payload) => {
      setOrders(prev =>
        prev.map(ord => (ord.id === payload.orderId ? { ...ord, status: payload.status } : ord))
      );
      if (selectedOrder && selectedOrder.id === payload.orderId) {
        setSelectedOrder(prev => ({ ...prev, status: payload.status }));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order? The farm produce will be restored to inventory.")) {
      return;
    }

    try {
      setCancellingId(orderId);
      const token = localStorage.getItem("token");
      await orderService.cancelOrder(orderId, token);
      alert("Order cancelled successfully. Stock has been returned to the farmer.");
      fetchOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: "cancelled" }));
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancellingId(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return order.status === 'pending' || order.status === 'processing';
    if (activeTab === 'shipped') return order.status === 'shipped';
    if (activeTab === 'delivered') return order.status === 'delivered' || order.status === 'completed';
    if (activeTab === 'cancelled') return order.status === 'cancelled';
    return true;
  });

  const getStatusConfig = (status) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          color: 'bg-green-100 text-green-800',
          textColor: 'text-green-600',
          bgColor: 'bg-green-50',
          label: 'Delivered',
          progress: 100
        };
      case 'shipped':
        return {
          icon: <Truck className="w-5 h-5" />,
          color: 'bg-blue-100 text-blue-800',
          textColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
          label: 'Dispatched / In Transit',
          progress: 75
        };
      case 'processing':
        return {
          icon: <Clock className="w-5 h-5" />,
          color: 'bg-purple-100 text-purple-800',
          textColor: 'text-purple-600',
          bgColor: 'bg-purple-50',
          label: 'Harvest Preparing',
          progress: 45
        };
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5" />,
          color: 'bg-amber-100 text-amber-800',
          textColor: 'text-amber-600',
          bgColor: 'bg-amber-50',
          label: 'Order Placed',
          progress: 20
        };
      case 'cancelled':
        return {
          icon: <Package className="w-5 h-5" />,
          color: 'bg-red-100 text-red-800',
          textColor: 'text-red-600',
          bgColor: 'bg-red-50',
          label: 'Cancelled',
          progress: 0
        };
      default:
        return {
          icon: <Package className="w-5 h-5" />,
          color: 'bg-gray-100 text-gray-800',
          textColor: 'text-gray-600',
          bgColor: 'bg-gray-50',
          label: status,
          progress: 10
        };
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="bg-white px-6 py-4 border-b shadow-sm flex items-center">
          <button onClick={() => navigate(-1)} className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">My Orders</h1>
        </div>
        <div className="max-w-6xl mx-auto p-8 flex flex-col items-center justify-center min-h-[50vh]">
          <RefreshCw className="w-12 h-12 text-green-600 animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Loading your orders & farm shipments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate(-1)} className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Order History</h1>
              <p className="text-sm text-gray-500">{orders.length} total orders</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/consumer/home')}
            className="bg-gradient-to-r from-[#1a5d36] to-green-600 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Shop More Produce
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex overflow-x-auto scrollbar-hide">
            {[
              { id: 'all', label: 'All Orders', count: orders.length },
              { id: 'pending', label: 'Processing', count: orders.filter(o => o.status === 'pending' || o.status === 'processing').length },
              { id: 'shipped', label: 'In Transit', count: orders.filter(o => o.status === 'shipped').length },
              { id: 'delivered', label: 'Delivered', count: orders.filter(o => o.status === 'delivered' || o.status === 'completed').length },
              { id: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length }
            ].map((tab) => {
              const config = getStatusConfig(tab.id);
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-4 font-medium text-sm whitespace-nowrap border-b-2 transition-all ${
                    activeTab === tab.id
                      ? `${config.textColor} border-current font-bold`
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  {tab.id !== 'all' && config.icon}
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${activeTab === tab.id ? 'bg-current/20' : 'bg-gray-100'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 p-8 my-6">
            <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No orders found</h2>
            <p className="text-gray-500 mb-6">
              {activeTab === 'all'
                ? "You haven't placed any orders yet. Fresh farm produce is just a click away!"
                : `No ${activeTab} orders at the moment.`}
            </p>
            <button
              onClick={() => navigate('/consumer/home')}
              className="bg-[#1a5d36] text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const status = getStatusConfig(order.status);
              const canCancel = order.status === 'pending' || order.status === 'processing';

              return (
                <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-2xl ${status.bgColor}`}>
                          {status.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-lg font-black text-gray-900 tracking-tight">Order #{order.trackingId}</h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.color}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {order.date} • {order.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <CreditCard className="w-3.5 h-3.5" />
                              {order.paymentMethod} ({order.paymentStatus})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total Amount</p>
                        <p className="text-2xl font-black text-gray-900">₹{order.total}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-5">
                      <div className="flex justify-between text-xs text-gray-500 mb-1.5 font-medium">
                        <span>Fulfillment Status</span>
                        <span>{status.label}</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${status.textColor.replace('text-', 'bg-')} transition-all duration-500`}
                          style={{ width: `${status.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Produce Items */}
                  <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-green-700" />
                      Produce ({order.items.length} items)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150';
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-gray-900 truncate">{item.name}</h4>
                            <p className="text-xs text-gray-500">{item.qty} {item.unit} × ₹{item.price}</p>
                          </div>
                          <span className="font-bold text-sm text-gray-900">₹{item.price * item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="p-4 bg-white flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span>{order.deliveryAddress || "Standard Delivery"}</span>
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Breakdown
                      </button>

                      <button
                        onClick={() => generateInvoice(order)}
                        className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Invoice PDF
                      </button>

                      {canCancel && (
                        <button
                          disabled={cancellingId === order.id}
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {cancellingId === order.id ? "Cancelling..." : "Cancel Order"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <SupportSection />
      </div>

      {/* Order Details Breakdown Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Order Details</h3>
                <p className="text-xs font-mono text-gray-500 mt-0.5">{selectedOrder.trackingId}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status & Delivery info */}
            <div className="py-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 uppercase">Status</span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 uppercase">
                  {selectedOrder.status}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Payment Mode:</span>
                <span className="font-bold uppercase">{selectedOrder.paymentMethod} ({selectedOrder.paymentStatus})</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Placed On:</span>
                <span className="font-medium">{selectedOrder.date} at {selectedOrder.time}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-1">
                <p className="font-bold text-gray-700">Delivery Address:</p>
                <p className="text-gray-600">{selectedOrder.deliveryAddress}</p>
              </div>
            </div>

            {/* Items List */}
            <div className="py-4 border-t border-gray-100">
              <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Purchased Items</h4>
              <div className="space-y-2">
                {selectedOrder.items.map((it, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-semibold text-gray-800">{it.name}</span>
                      <span className="text-gray-500 text-xs ml-2">×{it.qty} {it.unit}</span>
                    </div>
                    <span className="font-bold text-gray-900">₹{it.price * it.qty}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="py-4 border-t border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Produce Subtotal:</span>
                <span>₹{selectedOrder.subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST Tax (5%):</span>
                <span>₹{selectedOrder.tax}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Delivery Charge:</span>
                <span>{selectedOrder.deliveryFee === 0 ? "FREE" : `₹${selectedOrder.deliveryFee}`}</span>
              </div>
              <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200">
                <span>Grand Total:</span>
                <span className="text-green-700">₹{selectedOrder.total}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => generateInvoice(selectedOrder)}
                className="flex-1 py-3 bg-green-700 hover:bg-green-800 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Invoice
              </button>
              {(selectedOrder.status === 'pending' || selectedOrder.status === 'processing') && (
                <button
                  disabled={cancellingId === selectedOrder.id}
                  onClick={() => handleCancelOrder(selectedOrder.id)}
                  className="px-4 py-3 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl text-sm transition-all"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
