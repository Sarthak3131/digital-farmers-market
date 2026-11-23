import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getProductById } from "../../services/productService";
import { useCart } from "../../routes/CartContext";
import {
  ArrowLeft,
  ShoppingBag,
  Star,
  ShieldCheck,
  Truck,
  CheckCircle,
  MapPin,
  Calendar,
  Layers,
  Award,
  Plus,
  Minus
} from "lucide-react";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addedMessage, setAddedMessage] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getProductById(id);
        setProduct(data);
      } catch (err) {
        console.error("Error fetching product details:", err);
        setError(err.response?.data?.message || "Failed to load product details");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const handleAddToCart = () => {
    if (!product || product.stock <= 0) return;
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 2500);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate("/consumer/checkout");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Loading farm-fresh produce details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          <p className="text-red-500 font-bold mb-2">Produce Not Found</p>
          <p className="text-gray-600 text-sm mb-6">{error || "The produce you requested is unavailable."}</p>
          <button
            onClick={() => navigate("/consumer/home")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white font-medium rounded-xl hover:bg-green-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Market
          </button>
        </div>
      </div>
    );
  }

  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.image || "https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=600&auto=format&fit=crop"];

  const isOutOfStock = product.stock <= 0 || product.status === "sold_out";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb / Back button */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-green-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-xs uppercase tracking-wider font-bold bg-green-100 text-green-800 px-3 py-1 rounded-full">
            {product.category}
          </span>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-8 p-6 lg:p-10">
          {/* Left Column: Image Showcase */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 mb-4 relative">
              <img
                src={images[selectedImage] || images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              {product.grade && (
                <span className="absolute top-4 left-4 bg-yellow-500 text-white font-bold text-xs uppercase px-2.5 py-1 rounded-md shadow-sm">
                  Grade {product.grade}
                </span>
              )}
              {isOutOfStock ? (
                <span className="absolute top-4 right-4 bg-red-600 text-white font-bold text-xs px-3 py-1 rounded-full shadow-sm">
                  Sold Out
                </span>
              ) : (
                <span className="absolute top-4 right-4 bg-green-600 text-white font-bold text-xs px-3 py-1 rounded-full shadow-sm">
                  In Stock ({product.stock} {product.unit})
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 ${
                      selectedImage === idx ? "border-green-600" : "border-gray-200"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Produce Details & Purchase Action */}
          <div className="flex flex-col justify-between">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{product.name}</h1>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold text-sm text-gray-800">{product.rating || "4.8"}</span>
                  <span className="text-gray-400 text-xs">({product.reviewsCount || 15} reviews)</span>
                </div>
                <span className="text-gray-300">•</span>
                <span className="text-sm text-gray-600 font-medium">100% Farm Fresh</span>
              </div>

              {/* Price Banner */}
              <div className="p-4 bg-green-50 rounded-2xl border border-green-100 mb-6 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-green-900">₹{product.price}</span>
                <span className="text-sm font-semibold text-gray-600">/ {product.unit || "kg"}</span>
              </div>

              {/* Description */}
              <p className="text-gray-700 leading-relaxed mb-6">
                {product.description ||
                  `Pure, farm-harvested ${product.name}. Grown naturally using sustainable farming methods and delivered fresh to your doorstep.`}
              </p>

              {/* Product Metadata Attributes */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                  <Award className="w-5 h-5 text-green-700" />
                  <div>
                    <p className="text-xs text-gray-500">Grade & Quality</p>
                    <p className="text-sm font-bold text-gray-800">{product.grade || "Export Quality"}</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-green-700" />
                  <div>
                    <p className="text-xs text-gray-500">Origin State</p>
                    <p className="text-sm font-bold text-gray-800">{product.originState || "Local Organic Farm"}</p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-green-700" />
                  <div>
                    <p className="text-xs text-gray-500">Harvest Date</p>
                    <p className="text-sm font-bold text-gray-800">
                      {product.harvestDate
                        ? new Date(product.harvestDate).toLocaleDateString()
                        : "Fresh Today"}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                  <Layers className="w-5 h-5 text-green-700" />
                  <div>
                    <p className="text-xs text-gray-500">Category</p>
                    <p className="text-sm font-bold text-gray-800">{product.category}</p>
                  </div>
                </div>
              </div>

              {/* Farmer Info */}
              {product.seller && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">Produced By</p>
                    <p className="font-bold text-gray-900">{product.seller.name || "Verified Local Farmer"}</p>
                    <p className="text-xs text-gray-600">{product.seller.phone || product.seller.email || ""}</p>
                  </div>
                  {product.seller.isVerified && (
                    <span className="flex items-center gap-1 bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Quantity Selector & Action Buttons */}
            <div>
              {!isOutOfStock && (
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-sm font-bold text-gray-700">Quantity:</span>
                  <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 py-2 font-bold text-gray-800 min-w-[40px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      disabled={quantity >= product.stock}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">
                    Max: {product.stock} {product.unit}
                  </span>
                </div>
              )}

              {addedMessage && (
                <div className="mb-3 p-2 bg-green-100 text-green-800 rounded-xl text-center text-sm font-semibold flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-700" /> Added {quantity} {product.unit} to your basket!
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl border-2 border-green-700 text-green-800 font-bold hover:bg-green-50 disabled:opacity-50 transition-all"
                >
                  <ShoppingBag className="w-5 h-5" /> Add to Cart
                </button>
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#1a5d36] to-green-600 text-white font-bold hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  Buy Now • ₹{product.price * quantity}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
