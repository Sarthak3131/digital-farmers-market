import User from "../models/User.js";
import Order from "../models/Order.js";
import Auction from "../models/Auction.js";
import Product from "../models/Product.js";
import Dispute from "../models/Dispute.js";
import SystemConfig from "../models/SystemConfig.js";
import Notification from "../models/Notification.js";

// Helper to round numbers
const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// @desc    Get all users (with optional query filters)
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const { role, search, status } = req.query;
    const query = {};

    if (role && role !== "All" && role !== "all") {
      query.role = role.toLowerCase();
    }

    if (status && status !== "All") {
      query.isActive = status === "Active" || status === "active" || status === "true";
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }

    const users = await User.find(query).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Get All Users Error:", error);
    res.status(500).json({ message: "Failed to retrieve user registry" });
  }
};

// @desc    Get pending farmer verifications
// @route   GET /api/admin/farmers/pending
// @access  Private/Admin
export const getPendingFarmers = async (req, res) => {
  try {
    const farmers = await User.find({
      role: "farmer",
      isVerified: false
    }).select("-password").sort({ createdAt: -1 });

    res.json(farmers);
  } catch (error) {
    console.error("Get Pending Farmers Error:", error);
    res.status(500).json({ message: "Failed to retrieve pending farmer verifications" });
  }
};

// @desc    Toggle user active status (Suspend/Activate)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
export const toggleUserStatus = async (req, res) => {
  try {
    // Guard: Prevent self-suspension
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "Administrators cannot suspend their own account" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Guard: Prevent suspending other admins
    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot suspend another administrator account" });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.name} has been ${user.isActive ? "activated" : "suspended"}`,
      isActive: user.isActive,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error("Toggle User Status Error:", error);
    res.status(500).json({ message: "Failed to toggle user status" });
  }
};

// @desc    Verify farmer (Approve KYC)
// @route   PUT /api/admin/farmers/:id/verify
// @access  Private/Admin
export const verifyFarmer = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== "farmer") {
      return res.status(404).json({ message: "Farmer profile not found" });
    }

    user.isVerified = true;
    if (user.documents && Array.isArray(user.documents)) {
      user.documents.forEach((doc) => {
        doc.status = "valid";
      });
    }

    await user.save();

    // Broadcast notification
    const io = req.app.get("io");
    if (io) {
      io.emit("farmer_verified", {
        farmerId: user._id,
        farmerName: user.name,
        verifiedAt: new Date().toISOString()
      });
    }

    await createNotification(
      "Farmer Verified",
      `Farmer ${user.name} was successfully verified by Admin.`,
      "success",
      "/admin/farmer-verification"
    );

    res.json({ message: `Farmer "${user.name}" verified successfully`, isVerified: true });
  } catch (error) {
    console.error("Verify Farmer Error:", error);
    res.status(500).json({ message: "Failed to verify farmer application" });
  }
};

// @desc    Reject farmer application
// @route   PUT /api/admin/farmers/:id/reject
// @access  Private/Admin
export const rejectFarmer = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== "farmer") {
      return res.status(404).json({ message: "Farmer profile not found" });
    }

    // Mark documents as rejected rather than deleting user account completely
    user.isVerified = false;
    if (user.documents && Array.isArray(user.documents)) {
      user.documents.forEach((doc) => {
        doc.status = "invalid";
      });
    }
    await user.save();

    res.json({ message: `Farmer application for "${user.name}" rejected`, isVerified: false });
  } catch (error) {
    console.error("Reject Farmer Error:", error);
    res.status(500).json({ message: "Failed to process farmer application rejection" });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
export const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own admin account" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete administrator accounts" });
    }

    await User.deleteOne({ _id: user._id });
    res.json({ message: `User "${user.name}" removed successfully` });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ message: "Failed to delete user account" });
  }
};

// @desc    Emergency Stop Auction
// @route   PUT /api/admin/auctions/:id/stop
// @access  Private/Admin
export const stopAuction = async (req, res) => {
  try {
    const auction = await Auction.findById(req.params.id);
    if (!auction) {
      return res.status(404).json({ message: "Auction not found" });
    }

    auction.status = "cancelled";
    await auction.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("auction_update", {
        type: "STATUS_CHANGE",
        auctionId: auction._id,
        status: "cancelled"
      });
    }

    res.json({ message: "Auction emergency stopped", status: "cancelled" });
  } catch (error) {
    console.error("Stop Auction Error:", error);
    res.status(500).json({ message: "Failed to emergency stop auction" });
  }
};

// @desc    Get dashboard aggregated stats
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getDashboardStats = async (req, res) => {
  try {
    const [
      activeFarmersCount,
      verificationQueueCount,
      liveAuctionsCount,
      totalConsumersCount,
      totalProductsCount,
      openDisputesCount
    ] = await Promise.all([
      User.countDocuments({ role: "farmer", isActive: true }),
      User.countDocuments({ role: "farmer", isVerified: false }),
      Auction.countDocuments({ status: "active" }),
      User.countDocuments({ role: "consumer" }),
      Product.countDocuments({ status: { $ne: "archived" } }),
      Dispute.countDocuments({ status: "open" })
    ]);

    // Financial Metrics from all valid non-cancelled orders
    const financialAggregation = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: null,
          totalGMV: { $sum: "$totalAmount" },
          totalPlatformFees: { $sum: "$platformFee" },
          completedOrdersCount: {
            $sum: {
              $cond: [{ $in: ["$status", ["delivered", "completed"]] }, 1, 0]
            }
          }
        }
      }
    ]);

    const totalGMV = round2(financialAggregation[0]?.totalGMV || 0);
    const totalRevenue = round2(financialAggregation[0]?.totalPlatformFees || 0);

    // 7-Day Trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          fees: { $sum: "$platformFee" },
          volume: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const revenueTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const found = dailyRevenue.find((r) => r._id === dateStr);
      revenueTrend.push({
        name: dayName,
        value: round2(found ? (found.fees || found.volume * 0.025) : 0),
        volume: round2(found ? found.volume : 0)
      });
    }

    res.json({
      activeFarmers: activeFarmersCount,
      verificationQueue: verificationQueueCount,
      liveAuctions: liveAuctionsCount,
      totalConsumers: totalConsumersCount,
      totalProducts: totalProductsCount,
      openDisputes: openDisputesCount,
      totalGMV,
      totalRevenue,
      revenueTrend
    });
  } catch (error) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ message: "Failed to generate dashboard metrics" });
  }
};

// @desc    Get Revenue Analytics (Detailed)
// @route   GET /api/admin/revenue
// @access  Private/Admin
export const getRevenueAnalytics = async (req, res) => {
  try {
    const totalVolumeData = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: null,
          totalVolume: { $sum: "$totalAmount" },
          totalRevenue: { $sum: "$platformFee" }
        }
      }
    ]);

    const volume = round2(totalVolumeData[0]?.totalVolume || 0);
    const fees = round2(totalVolumeData[0]?.totalRevenue || 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          status: { $ne: "cancelled" },
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          fees: { $sum: "$platformFee" },
          volume: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const found = dailyRevenue.find((r) => r._id === dateStr);
      chartData.push({
        name: dayName,
        value: round2(found ? (found.fees || found.volume * 0.025) : 0),
        volume: round2(found ? found.volume : 0),
        fullDate: dateStr
      });
    }

    res.json({
      totalVolume: volume,
      totalRevenue: fees,
      chartData
    });
  } catch (error) {
    console.error("Revenue Analytics Error:", error);
    res.status(500).json({ message: "Failed to generate revenue analytics" });
  }
};

// @desc    Get System Config
// @route   GET /api/admin/config
// @access  Private/Admin
export const getSystemConfig = async (req, res) => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = await SystemConfig.create({
        maintenanceMode: false,
        allowRegistration: true,
        platformFee: 2.5,
        emailNotifications: true,
        autoApproveFarmers: false,
        debugMode: false
      });
    }
    res.json(config);
  } catch (error) {
    console.error("Get Config Error:", error);
    res.status(500).json({ message: "Failed to retrieve system configuration" });
  }
};

// @desc    Update System Config
// @route   PUT /api/admin/config
// @access  Private/Admin
export const updateSystemConfig = async (req, res) => {
  try {
    let config = await SystemConfig.findOne();
    if (config) {
      Object.assign(config, req.body);
      await config.save();
      res.json(config);
    } else {
      const newConfig = await SystemConfig.create(req.body);
      res.json(newConfig);
    }
  } catch (error) {
    console.error("Update Config Error:", error);
    res.status(500).json({ message: "Failed to update system configuration" });
  }
};

// @desc    Get All Disputes
// @route   GET /api/admin/disputes
// @access  Private/Admin
export const getDisputes = async (req, res) => {
  try {
    const disputes = await Dispute.find({})
      .populate("raisedBy", "name email role")
      .populate("targetUser", "name email role")
      .populate("order", "trackingId totalAmount status")
      .sort({ createdAt: -1 });

    res.json(disputes);
  } catch (error) {
    console.error("Get Disputes Error:", error);
    res.status(500).json({ message: "Failed to retrieve dispute logs" });
  }
};

// @desc    Resolve Dispute
// @route   PUT /api/admin/disputes/:id/resolve
// @access  Private/Admin
export const resolveDispute = async (req, res) => {
  try {
    const { resolution, status } = req.body;
    const dispute = await Dispute.findById(req.params.id);

    if (!dispute) {
      return res.status(404).json({ message: "Dispute not found" });
    }

    dispute.status = status || "resolved";
    dispute.resolution = resolution || "Resolved by platform administrator.";
    await dispute.save();

    res.json({ message: "Dispute resolved successfully", dispute });
  } catch (error) {
    console.error("Resolve Dispute Error:", error);
    res.status(500).json({ message: "Failed to update dispute status" });
  }
};

// @desc    Get Admin Notifications
// @route   GET /api/admin/notifications
// @access  Private/Admin
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(15);
    res.json(notifications);
  } catch (error) {
    console.error("Get Notifications Error:", error);
    res.status(500).json({ message: "Failed to retrieve administrative notifications" });
  }
};

// @desc    Mark Notification as Read
// @route   PUT /api/admin/notifications/:id/read
// @access  Private/Admin
export const markNotificationRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark Notification Read Error:", error);
    res.status(500).json({ message: "Failed to mark notification" });
  }
};

// @desc    (Internal Helper) Create Notification
export const createNotification = async (title, message, type = "info", link = null) => {
  try {
    const notification = await Notification.create({ title, message, type, link });
    return notification;
  } catch (error) {
    console.error("Notification Creation Error:", error);
    return null;
  }
};
