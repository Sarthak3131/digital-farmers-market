import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import bidService from "../services/bidService";
import {
  Gavel,
  Clock,
  Trophy,
  History,
  User,
  AlertCircle,
  ArrowUp,
  CheckCircle,
  Tag,
  ArrowLeft,
} from "lucide-react";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace("/api", "")
    : "http://localhost:5000");

export default function AuctionItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [auction, setAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState("");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [timeLeft, setTimeLeft] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved) setCurrentUser(JSON.parse(saved));
    } catch (e) {
      console.error("Failed to parse user", e);
    }
  }, []);

  useEffect(() => {
    const fetchAuction = async () => {
      try {
        const res = await bidService.getAuction(id);
        setAuction(res);
        const minNext = (res.currentPrice || 0) + (res.bidIncrement || 50);
        setBidAmount(minNext);
      } catch (err) {
        console.error("Failed to load auction", err);
        setErrorMsg("Failed to load auction details");
      }
    };

    fetchAuction();

    // Socket Connection
    const token = localStorage.getItem("token");
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      socket.emit("join_auction", id);
    });

    socket.on("new_bid", (data) => {
      // Ensure bid corresponds to this auction
      if (data.auctionId && data.auctionId !== id) return;

      setAuction((prev) => {
        if (!prev) return prev;
        const updatedBids = data.bid
          ? [data.bid, ...(prev.bids || [])]
          : prev.bids || [];
        return {
          ...prev,
          currentPrice: data.currentPrice,
          highestBidder: data.highestBidder,
          bids: updatedBids,
        };
      });

      setMessage(`🔥 New top bid: ₹${data.currentPrice} by ${data.bidderName || "a bidder"}!`);
      const nextSuggested = data.currentPrice + (auction?.bidIncrement || 50);
      setBidAmount(nextSuggested);

      setTimeout(() => setMessage(""), 4000);
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  // Countdown Timer
  useEffect(() => {
    if (!auction?.endTime) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(auction.endTime).getTime();
      const distance = end - now;

      if (distance <= 0) {
        clearInterval(timer);
        setTimeLeft("Auction Ended");
      } else {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        if (days > 0) {
          setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [auction?.endTime]);

  const handlePlaceBid = async () => {
    setErrorMsg("");
    setMessage("");

    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please login to place a bid");
      navigate("/");
      return;
    }

    if (isSeller) {
      setErrorMsg("You cannot bid on your own auction.");
      return;
    }

    const numBid = Number(bidAmount);
    const minNext = (auction.currentPrice || 0) + (auction.bidIncrement || 50);
    if (isNaN(numBid) || numBid < minNext) {
      setErrorMsg(`Bid must be at least ₹${minNext}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await bidService.placeBid(id, numBid, token);
      setMessage("Your bid was placed successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || "Bid placement failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!auction) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-medium">Entering Live Auction Arena...</p>
        </div>
      </div>
    );
  }

  const isAuctionEnded = timeLeft === "Auction Ended" || auction.status === "completed";
  const sellerId = auction.seller?._id || auction.seller;
  const isSeller = currentUser && sellerId && sellerId.toString() === currentUser._id?.toString();
  const highestBidderId = auction.highestBidder?._id || auction.highestBidder;
  const isWinner =
    isAuctionEnded &&
    highestBidderId &&
    currentUser &&
    highestBidderId.toString() === currentUser._id?.toString();

  // Winner View
  if (isWinner) {
    return (
      <div className="min-h-screen bg-[#0f172a] font-sans text-white p-6 relative flex items-center justify-center">
        <div className="max-w-md w-full bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-xl border border-yellow-500/30 rounded-3xl p-8 text-center shadow-2xl relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-6 shadow-lg animate-bounce">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">You Won!</h1>
          <p className="text-yellow-200/80 mb-6 text-sm">
            Congratulations! You placed the highest winning bid on this harvest lot.
          </p>

          <div className="bg-black/30 rounded-2xl p-6 mb-6 border border-white/10">
            <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Winning Final Price</p>
            <p className="text-5xl font-black text-emerald-400 mb-3">₹{auction.currentPrice}</p>
            <div className="text-sm text-gray-300 font-semibold">
              {auction.product?.name} ({auction.product?.quantity || 1} {auction.product?.unit || "kg"})
            </div>
          </div>

          <button
            onClick={() => navigate("/consumer/orders")}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3.5 rounded-xl shadow-lg transition-all"
          >
            View Your Orders
          </button>
          <button
            onClick={() => navigate("/consumer/auctions")}
            className="mt-3 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Explore Other Auctions
          </button>
        </div>
      </div>
    );
  }

  const productImage =
    auction.product?.images?.[0] ||
    "https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?q=80&w=600&auto=format&fit=crop";

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans text-white p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[140px]"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10 pt-4 pb-12">
        {/* Back Link */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-semibold mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Auctions
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Product Details & Live Info */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="bg-emerald-500 text-black text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 bg-black rounded-full animate-pulse"></span>
                  {isAuctionEnded ? "Auction Closed" : "Live Bidding"}
                </span>

                <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  {timeLeft}
                </span>
              </div>

              <div className="relative h-64 md:h-72 rounded-2xl overflow-hidden mb-6 bg-black/40 border border-white/5">
                <img
                  src={productImage}
                  alt={auction.product?.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 text-emerald-400">
                  <Tag className="w-3.5 h-3.5" />
                  Grade {auction.product?.grade || "A+"}
                </div>
              </div>

              <h1 className="text-3xl font-black tracking-tight mb-2">
                {auction.product?.name || "Harvest Lot"}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-6">
                <span className="bg-white/10 px-3 py-1 rounded-lg">
                  Lot Size: {auction.product?.quantity || 1} {auction.product?.unit || "kg"}
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <User className="w-4 h-4 text-emerald-400" />
                  Farmer: <strong className="text-white">{auction.seller?.name || "Verified Farmer"}</strong>
                  {auction.seller?.isVerified && (
                    <CheckCircle className="w-4 h-4 text-emerald-400 inline" />
                  )}
                </span>
              </div>

              {auction.product?.description && (
                <p className="text-sm text-gray-300/90 leading-relaxed mb-6">
                  {auction.product.description}
                </p>
              )}

              {/* Price Stats Banner */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
                    Current Highest Bid
                  </p>
                  <p className="text-4xl font-black text-emerald-400">₹{auction.currentPrice}</p>
                </div>
                <div className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">
                    Starting Base Price
                  </p>
                  <p className="text-2xl font-bold text-gray-400 mt-2">₹{auction.startingPrice}</p>
                </div>
              </div>
            </div>

            {/* Bid History Stream */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-emerald-400" />
                Live Bid Log ({(auction.bids || []).length} bids)
              </h3>

              <div className="space-y-2 max-h-52 overflow-y-auto pr-2">
                {(auction.bids || []).length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">
                    No bids yet. Be the first to place a bid!
                  </p>
                ) : (
                  (auction.bids || []).map((b, idx) => (
                    <div
                      key={b._id || idx}
                      className={`p-3 rounded-xl flex items-center justify-between text-sm ${
                        idx === 0
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-white"
                          : "bg-white/5 text-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {idx === 0 && <Trophy className="w-4 h-4 text-emerald-400" />}
                        <span className="font-semibold">{b.bidder?.name || "Bidder"}</span>
                        {idx === 0 && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                            Current Leader
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-emerald-400">₹{b.amount}</span>
                        <span className="text-xs text-gray-500">
                          {b.createdAt
                            ? new Date(b.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Bidding Panel */}
          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl sticky top-6">
              <div className="flex items-center gap-2 text-xl font-bold border-b border-white/10 pb-4 mb-6">
                <Gavel className="w-6 h-6 text-emerald-400" />
                Place Your Bid
              </div>

              {message && (
                <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 rounded-xl text-xs font-semibold text-center">
                  {message}
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              {isSeller ? (
                <div className="p-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center">
                  <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-amber-200 mb-1">Your Listing</h4>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    You are the seller of this produce lot. Shill bidding is strictly prohibited under platform rules.
                  </p>
                </div>
              ) : isAuctionEnded ? (
                <div className="p-6 bg-gray-800/80 border border-white/10 rounded-2xl text-center">
                  <Clock className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-gray-200 mb-1">Bidding Closed</h4>
                  <p className="text-xs text-gray-400">
                    This auction has ended. Check out other available produce auctions.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="bg-black/30 p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                    <span className="text-xs text-gray-400 font-semibold">Minimum Next Bid</span>
                    <span className="text-xl font-black text-emerald-400">
                      ₹{auction.currentPrice + (auction.bidIncrement || 50)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Enter Bid Amount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-3.5 text-gray-400 font-bold text-lg">₹</span>
                      <input
                        type="number"
                        min={auction.currentPrice + (auction.bidIncrement || 50)}
                        step={auction.bidIncrement || 50}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        className="w-full bg-black/40 border border-white/20 rounded-xl pl-9 pr-4 py-3 text-white text-xl font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      />
                    </div>
                  </div>

                  {/* Quick Increment Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[50, 100, 200].map((inc) => (
                      <button
                        key={inc}
                        type="button"
                        onClick={() => setBidAmount(auction.currentPrice + inc)}
                        className="py-2 bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold text-gray-300 transition"
                      >
                        +₹{inc}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handlePlaceBid}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-black font-black py-4 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all text-base flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      "Submitting Bid..."
                    ) : (
                      <>
                        Confirm & Place Bid <ArrowUp className="w-5 h-5" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-gray-400 text-center leading-normal">
                    By submitting a bid, you commit to purchase this lot at your specified price if declared the winner upon auction completion.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
