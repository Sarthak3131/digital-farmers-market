import { useState, useEffect } from "react";
import io from "socket.io-client";
import {
  Gavel,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  Plus,
  X,
  AlertCircle,
  DollarSign,
  Package,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import productService from "../../services/productService";
import bidService from "../../services/bidService";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace("/api", "")
    : "http://localhost:5000");

export default function FarmerBidding() {
  const [activeAuctions, setActiveAuctions] = useState([]);
  const [farmerProducts, setFarmerProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    productId: "",
    startingPrice: "",
    durationHours: "24",
    bidIncrement: "50",
  });

  useEffect(() => {
    fetchAuctions();
    fetchFarmerProducts();

    const token = localStorage.getItem("token");
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    socket.on("new_bid", (data) => {
      setActiveAuctions((prev) =>
        prev.map((a) => {
          if (a._id === data.auctionId || a._id === data.productId) {
            return {
              ...a,
              currentPrice: data.currentPrice,
              highestBidder: data.highestBidder || { name: data.bidderName },
              bidsCount: (a.bidsCount || 0) + 1,
            };
          }
          return a;
        })
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchAuctions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await bidService.getSellerAuctions(token);
      setActiveAuctions(res || []);
    } catch (error) {
      console.error("Error fetching seller auctions:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmerProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const prods = await productService.getMyProducts(token);
      setFarmerProducts(prods || []);
      if (prods && prods.length > 0) {
        setFormData((prev) => ({
          ...prev,
          productId: prods[0]._id,
          startingPrice: prods[0].price || "50",
        }));
      }
    } catch (err) {
      console.error("Failed to load farmer products", err);
    }
  };

  const handleProductSelect = (e) => {
    const selectedId = e.target.value;
    const prod = farmerProducts.find((p) => p._id === selectedId);
    setFormData((prev) => ({
      ...prev,
      productId: selectedId,
      startingPrice: prod ? prod.price : prev.startingPrice,
    }));
  };

  const handleCreateAuction = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const hours = Number(formData.durationHours) || 24;
      const endTime = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      const payload = {
        productId: formData.productId,
        startingPrice: Number(formData.startingPrice),
        bidIncrement: Number(formData.bidIncrement) || 50,
        endTime,
      };

      const created = await bidService.createAuction(payload, token);
      setActiveAuctions((prev) => [created, ...prev]);
      setShowModal(false);
    } catch (err) {
      console.error("Create auction failed:", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to create auction");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewLive = (id) => {
    navigate(`/consumer/auctions/${id}`);
  };

  // Stats
  const activeCount = activeAuctions.filter((a) => a.status === "active").length;
  const totalVolume = activeAuctions.reduce((sum, a) => sum + (a.currentPrice || 0), 0);
  const totalCompleted = activeAuctions.filter((a) => a.status === "completed").length;

  return (
    <div className="p-6 font-sans text-gray-800 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Gavel className="w-8 h-8 text-emerald-600" />
            Farmer Live Bidding Arena
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Create real-time auctions for your bulk harvest lots and watch buyers compete live.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Launch New Auction
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Active Auctions</p>
            <h3 className="text-3xl font-black text-gray-900">{activeCount}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Live Bidding Volume</p>
            <h3 className="text-3xl font-black text-emerald-600">₹{totalVolume}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Completed Lots</p>
            <h3 className="text-3xl font-black text-gray-900">{totalCompleted}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Auctions Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Your Harvest Auction Lots</h2>
          <p className="text-xs text-gray-400 mt-0.5">Real-time socket updates are active.</p>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-400">Loading auction listings...</div>
          ) : activeAuctions.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No auction lots found. Click "Launch New Auction" to create your first lot!
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Produce Lot</th>
                  <th className="px-6 py-4">Base Price</th>
                  <th className="px-6 py-4">Current Top Bid</th>
                  <th className="px-6 py-4">Leading Buyer</th>
                  <th className="px-6 py-4">End Time</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {activeAuctions.map((item) => {
                  const isEnded = new Date(item.endTime) < new Date() || item.status === "completed";

                  return (
                    <tr key={item._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{item.product?.name || "Produce Lot"}</div>
                        <div className="text-xs text-gray-400">
                          {item.product?.quantity || 1} {item.product?.unit || "kg"} • Grade {item.product?.grade || "A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-500">₹{item.startingPrice}</td>
                      <td className="px-6 py-4 font-black text-emerald-600 text-base">₹{item.currentPrice}</td>
                      <td className="px-6 py-4">
                        {item.highestBidder?.name ? (
                          <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-emerald-500" />
                            {item.highestBidder.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">No bids yet</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-gray-500">
                        {new Date(item.endTime).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            isEnded
                              ? "bg-gray-100 text-gray-600"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isEnded ? "Ended" : "Live"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleViewLive(item._id)}
                          className="text-emerald-600 hover:text-emerald-700 font-bold text-xs bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
                        >
                          View Arena
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Launch New Auction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Gavel className="w-5 h-5 text-emerald-600" />
                Launch Live Auction
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateAuction} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Select Harvest Produce *
                </label>
                {farmerProducts.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl">
                    You have no products listed. Please add a product in your inventory first.
                  </p>
                ) : (
                  <select
                    value={formData.productId}
                    onChange={handleProductSelect}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {farmerProducts.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.stock} {p.unit} in stock - ₹{p.price})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Starting Base Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="100"
                    value={formData.startingPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, startingPrice: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Min Bid Step (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={formData.bidIncrement}
                    onChange={(e) =>
                      setFormData({ ...formData, bidIncrement: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Auction Duration
                </label>
                <select
                  value={formData.durationHours}
                  onChange={(e) =>
                    setFormData({ ...formData, durationHours: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="1">1 Hour (Flash Auction)</option>
                  <option value="6">6 Hours</option>
                  <option value="12">12 Hours</option>
                  <option value="24">24 Hours (1 Day)</option>
                  <option value="48">48 Hours (2 Days)</option>
                  <option value="72">72 Hours (3 Days)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || farmerProducts.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-emerald-600/20 transition disabled:opacity-50"
                >
                  {submitting ? "Launching..." : "Start Auction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
