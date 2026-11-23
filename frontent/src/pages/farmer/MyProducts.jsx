import { useState, useEffect } from "react";
import productService from "../../services/productService";
import bidService from "../../services/bidService";
import {
  Package,
  TrendingUp,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  Edit3,
  X,
  AlertCircle,
  Tag,
  Layers,
  ShoppingBag,
  Gavel
} from "lucide-react";

export default function MyProducts() {
  const [activeTab, setActiveTab] = useState("direct"); // "direct" | "auctions"
  const [products, setProducts] = useState([]);
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const categories = [
    "Vegetables",
    "Fruits",
    "Grains",
    "Dairy",
    "Organic",
    "Seeds",
    "Spices",
    "Herbs",
    "Exotic",
    "Other",
  ];

  const [formData, setFormData] = useState({
    name: "",
    category: "Vegetables",
    price: "",
    stock: "50",
    unit: "kg",
    grade: "A",
    description: "",
    image: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Fetch direct sale marketplace products
      const prods = await productService.getMyProducts(token);
      setProducts(prods || []);

      // Fetch auction lots
      try {
        const aucs = await bidService.getSellerAuctions(token);
        setAuctions(aucs || []);
      } catch (aucErr) {
        console.warn("Could not load auctions", aucErr);
      }
    } catch (err) {
      console.error("Failed to fetch farmer inventory", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const payload = {
        name: formData.name,
        category: formData.category,
        price: Number(formData.price),
        stock: Number(formData.stock),
        unit: formData.unit,
        grade: formData.grade,
        description: formData.description,
        images: formData.image ? [formData.image] : [
          "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=400&auto=format&fit=crop"
        ],
      };

      const created = await productService.createProduct(payload, token);
      setProducts((prev) => [created, ...prev]);
      setShowAddModal(false);
      setFormData({
        name: "",
        category: "Vegetables",
        price: "",
        stock: "50",
        unit: "kg",
        grade: "A",
        description: "",
        image: "",
      });
    } catch (err) {
      console.error("Create product failed", err);
      setErrorMsg(err.response?.data?.message || err.message || "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockDelta = async (product, delta) => {
    const newStock = Math.max(0, (product.stock || 0) + delta);
    try {
      const token = localStorage.getItem("token");
      const updated = await productService.updateProduct(
        product._id,
        { stock: newStock },
        token
      );
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? updated : p))
      );
    } catch (err) {
      console.error("Failed to update stock", err);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Are you sure you want to remove this product from the marketplace?")) return;
    try {
      const token = localStorage.getItem("token");
      await productService.deleteProduct(id, token);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error("Failed to delete product", err);
    }
  };

  return (
    <div className="p-6 font-sans text-gray-800 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Package className="w-8 h-8 text-emerald-600" />
            Farmer Inventory & Stock
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your fresh produce catalog, live harvest stock, and auction lots.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-emerald-600/20 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Add New Produce
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab("direct")}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "direct"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          Marketplace Produce ({products.length})
        </button>
        <button
          onClick={() => setActiveTab("auctions")}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
            activeTab === "auctions"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-gray-400 hover:text-gray-600"
          }`}
        >
          <Gavel className="w-4 h-4" />
          Auction Lots ({auctions.length})
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 font-medium">Loading your farm inventory...</p>
        </div>
      ) : activeTab === "direct" ? (
        /* Direct Produce Grid */
        <div>
          {products.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-600 mb-1">No products in inventory</h3>
              <p className="text-gray-400 text-sm mb-4">Click below to add your first harvest listing.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-700 transition"
              >
                Add Produce Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((item) => {
                const isLow = (item.stock || 0) < 10 && (item.stock || 0) > 0;
                const isOut = (item.stock || 0) <= 0;

                return (
                  <div
                    key={item._id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="relative h-44 bg-gray-100 overflow-hidden">
                      <img
                        src={item.images?.[0] || "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=400&auto=format&fit=crop"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Tag className="w-3 h-3 text-emerald-400" />
                        {item.category}
                      </span>
                      <span
                        className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full ${
                          isOut
                            ? "bg-red-100 text-red-700"
                            : isLow
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {isOut ? "Sold Out" : isLow ? "Low Stock" : "Available"}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-baseline justify-between mb-1">
                          <h3 className="font-bold text-gray-800 text-lg leading-snug">{item.name}</h3>
                          <span className="text-xl font-black text-emerald-700">₹{item.price}</span>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                          Per {item.unit || "kg"} • Grade {item.grade || "A"}
                        </p>
                        {item.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mb-4">{item.description}</p>
                        )}
                      </div>

                      {/* Stock Adjuster & Actions */}
                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-500">Stock:</span>
                          <button
                            onClick={() => handleStockDelta(item, -5)}
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-sm"
                          >
                            -
                          </button>
                          <span className="text-sm font-bold text-gray-800 min-w-8 text-center">
                            {item.stock} {item.unit}
                          </span>
                          <button
                            onClick={() => handleStockDelta(item, 5)}
                            className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-sm"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => handleDeleteProduct(item._id)}
                          title="Delete Product"
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Auction Lots View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auctions.map((auction) => {
            const isEnded = new Date(auction.endTime) < new Date();
            const isSold = isEnded && auction.highestBidder;

            return (
              <div
                key={auction._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative p-6"
              >
                {isSold ? (
                  <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Sold
                  </div>
                ) : (
                  <div className="absolute top-4 right-4 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Active
                  </div>
                )}

                <h3 className="text-lg font-bold text-gray-800 mb-1">{auction.product?.name || "Auction Lot"}</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {auction.product?.quantity} {auction.product?.unit} • Grade {auction.product?.grade}
                </p>

                <div className="bg-gray-50 rounded-xl p-4 mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-500 text-xs uppercase font-bold">Current Bid</span>
                    <span className="text-2xl font-black text-emerald-600">₹{auction.currentPrice}</span>
                  </div>
                  {isSold && (
                    <div className="pt-2 border-t border-gray-200 mt-2">
                      <p className="text-xs text-gray-500">
                        Winner: <span className="font-bold text-gray-700">{auction.highestBidder?.name || "Unknown"}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {auctions.length === 0 && (
            <div className="col-span-full text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-gray-400">No active auction lots found.</p>
            </div>
          )}
        </div>
      )}

      {/* Add Produce Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                Add Fresh Produce
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
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

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Organic Roma Tomatoes"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Grade</label>
                  <select
                    name="grade"
                    value={formData.grade}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="A+">A+ (Premium)</option>
                    <option value="A">A (Standard)</option>
                    <option value="B">B (Good)</option>
                    <option value="Organic">Certified Organic</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    name="price"
                    required
                    min="1"
                    placeholder="40"
                    value={formData.price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Stock *</label>
                  <input
                    type="number"
                    name="stock"
                    required
                    min="1"
                    placeholder="50"
                    value={formData.stock}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="kg">kg</option>
                    <option value="bunch">bunch</option>
                    <option value="dozen">dozen</option>
                    <option value="packet">packet</option>
                    <option value="Litre">Litre</option>
                    <option value="box">box</option>
                    <option value="pc">pc</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  name="image"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows="2"
                  placeholder="Freshly harvested, naturally grown..."
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-md hover:shadow-emerald-600/20 transition disabled:opacity-50"
                >
                  {submitting ? "Publishing..." : "Publish Produce"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
