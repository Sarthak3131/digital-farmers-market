import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";
import Product from "../models/Product.js";
import mongoose from "mongoose";

// @desc    Create a new auction
// @route   POST /api/auctions/create
// @access  Private (Farmer/Admin)
export const createAuction = async (req, res) => {
  try {
    const { productId, startingPrice, endTime, bidIncrement } = req.body;

    if (!productId || startingPrice === undefined || !endTime) {
      return res.status(400).json({ message: "Product, starting price, and end time are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ message: "Invalid product ID format" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Ownership check: seller must own product unless admin
    if (product.seller.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "You can only create auctions for your own products" });
    }

    const endDateTime = new Date(endTime);
    if (isNaN(endDateTime.getTime()) || endDateTime <= new Date()) {
      return res.status(400).json({ message: "End time must be a valid future date and time" });
    }

    const numStartingPrice = Number(startingPrice);
    if (isNaN(numStartingPrice) || numStartingPrice < 0) {
      return res.status(400).json({ message: "Starting price must be a valid positive number" });
    }

    const auction = new Auction({
      product: productId,
      seller: req.user._id,
      startingPrice: numStartingPrice,
      currentPrice: numStartingPrice,
      bidIncrement: bidIncrement ? Math.max(1, Number(bidIncrement)) : 50,
      endTime: endDateTime,
      status: "active",
    });

    const saved = await auction.save();
    const populated = await saved.populate([
      { path: "product" },
      { path: "seller", select: "name email phone isVerified" },
    ]);

    // Notify connected clients of the new auction
    const io = req.app.get("io");
    if (io) {
      io.emit("new_auction", populated);
    }

    res.status(201).json(populated);
  } catch (error) {
    console.error("Error creating auction:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Place a bid with optimistic concurrency control
// @route   POST /api/auctions/bid
// @access  Private (Consumer/Buyer)
export const placeBid = async (req, res) => {
  try {
    const { auctionId, amount } = req.body;
    const userId = req.user._id;

    if (!auctionId || amount === undefined || isNaN(Number(amount))) {
      return res.status(400).json({ message: "Valid auction ID and bid amount are required" });
    }

    const auction = await Auction.findById(auctionId).populate("product");

    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    // Shill Bidding Guard: Sellers cannot bid on their own auction
    if (auction.seller.toString() === userId.toString()) {
      return res.status(400).json({ message: "Sellers are prohibited from bidding on their own auctions" });
    }

    // Expiry check
    const now = new Date();
    if (auction.status !== "active" || now > new Date(auction.endTime)) {
      if (auction.status === "active") {
        auction.status = "completed";
        await auction.save();
      }
      return res.status(400).json({ message: "Auction has ended" });
    }

    const numAmount = Number(amount);

    // Validate minimum bid requirement
    let minRequired = auction.startingPrice;
    if (auction.highestBidder) {
      minRequired = auction.currentPrice + (auction.bidIncrement || 50);
    }

    if (numAmount < minRequired) {
      return res.status(400).json({
        message: `Bid must be at least ₹${minRequired} (current price ₹${auction.currentPrice} + min increment ₹${auction.bidIncrement || 50})`,
      });
    }

    // Optimistic concurrency control: atomically update currentPrice and leader
    const updatedAuction = await Auction.findOneAndUpdate(
      { _id: auctionId, currentPrice: auction.currentPrice, status: "active" },
      { $set: { currentPrice: numAmount, highestBidder: userId } },
      { new: true }
    );

    if (!updatedAuction) {
      return res.status(409).json({
        message: "Another bid was placed concurrently. Please refresh the latest price and try again.",
      });
    }

    // Record bid in audit history
    const newBid = await Bid.create({
      auction: auctionId,
      bidder: userId,
      amount: numAmount,
    });

    // Socket.io Real-time Broadcast
    const io = req.app.get("io");
    if (io) {
      const bidCount = await Bid.countDocuments({ auction: auction._id });
      const bidPayload = {
        auctionId: auction._id.toString(),
        productId: auction.product?._id ? auction.product._id.toString() : (auction.product?.toString() || ""),
        productName: auction.product?.name || "Produce Lot",
        currentPrice: numAmount,
        highestBidder: {
          _id: req.user._id,
          name: req.user.name,
        },
        bidderName: req.user.name,
        bidsCount: bidCount,
        bid: {
          _id: newBid._id,
          amount: numAmount,
          bidder: {
            _id: req.user._id,
            name: req.user.name,
          },
          createdAt: newBid.createdAt || new Date(),
        },
      };

      // Room broadcast to clients currently viewing this auction
      io.to(auctionId.toString()).emit("new_bid", bidPayload);
      // Global broadcast for market ticker, farmer dashboard, and live monitor
      io.emit("new_bid", bidPayload);
    }

    res.status(200).json({
      message: "Bid placed successfully",
      currentPrice: numAmount,
      highestBidder: {
        _id: req.user._id,
        name: req.user.name,
      },
    });
  } catch (error) {
    console.error("placeBid error:", error);
    res.status(500).json({ message: "Bid placement failed", error: error.message });
  }
};

// @desc    Get single auction with full product, seller, and bid history
// @route   GET /api/auctions/:id
// @access  Public
export const getAuction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid auction ID format" });
    }

    const auction = await Auction.findById(id)
      .populate("product")
      .populate("highestBidder", "name email")
      .populate("seller", "name email phone isVerified");

    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    // Auto-update status if ended
    if (auction.status === "active" && new Date() > new Date(auction.endTime)) {
      auction.status = "completed";
      await auction.save();
    }

    // Fetch chronological bid history (newest first)
    const bids = await Bid.find({ auction: id })
      .populate("bidder", "name")
      .sort({ createdAt: -1 });

    res.json({
      ...auction.toObject(),
      bids: bids || [],
    });
  } catch (err) {
    console.error("getAuction error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// @desc    Get auctions for the logged-in seller
// @route   GET /api/auctions/seller
// @access  Private (Farmer)
export const getSellerAuctions = async (req, res) => {
  try {
    const auctions = await Auction.find({ seller: req.user._id })
      .populate("product")
      .populate("highestBidder", "name email")
      .sort({ createdAt: -1 });

    res.json(auctions);
  } catch (error) {
    console.error("Error fetching seller auctions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get all active auctions (for Consumers & Admin)
// @route   GET /api/auctions
// @access  Public
export const getAllAuctions = async (req, res) => {
  try {
    const statusQuery = req.query.status;
    const filter = {};

    if (statusQuery && statusQuery !== "all") {
      filter.status = statusQuery;
    } else if (!statusQuery) {
      filter.status = "active";
    }

    // Auto-close past auctions
    await Auction.updateMany(
      { status: "active", endTime: { $lt: new Date() } },
      { status: "completed" }
    );

    const auctions = await Auction.find(filter)
      .populate("product")
      .populate("seller", "name email phone isVerified")
      .populate("highestBidder", "name email")
      .sort({ createdAt: -1 });

    res.json(auctions);
  } catch (error) {
    console.error("Error fetching all auctions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Get formatted recent bids across all auctions (for Market Ticker & Live Feed)
// @route   GET /api/auctions/feed
// @access  Public
export const getRecentBids = async (req, res) => {
  try {
    const bids = await Bid.find()
      .populate({
        path: "auction",
        populate: { path: "product", select: "name images unit" },
      })
      .populate("bidder", "name")
      .sort({ createdAt: -1 })
      .limit(15);

    // Format output with message, amount, product, and time for MarketTicker
    const feed = bids.map((b) => {
      const productName = b.auction?.product?.name || "produce lot";
      const bidderName = b.bidder?.name || "A buyer";
      return {
        id: b._id,
        message: `${bidderName} placed a bid of ₹${b.amount} on ${productName}`,
        amount: b.amount,
        product: productName,
        bidder: bidderName,
        time: b.createdAt || b.timestamp || new Date(),
      };
    });

    res.json(feed);
  } catch (error) {
    console.error("Error fetching recent bids:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
