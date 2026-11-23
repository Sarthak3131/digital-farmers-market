import express from "express";
import { protect, admin } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import {
  createOrder,
  getMyOrders,
  getFarmerOrders,
  getOrderById,
  updateOrderStatus,
  cancelMyOrder,
  getAllOrders
} from "../controllers/orderController.js";

const router = express.Router();

// Order creation and admin listing
router.route("/")
  .post(protect, createOrder)
  .get(protect, admin, getAllOrders);

// User-specific orders
router.route("/my").get(protect, getMyOrders);

// Farmer-specific orders (produce sold by this farmer)
router.route("/farmer").get(protect, roleMiddleware("farmer", "admin"), getFarmerOrders);

// Single order details
router.route("/:id").get(protect, getOrderById);

// Order status updates (fulfillment by farmer or admin)
router.route("/:id/status").put(protect, roleMiddleware("farmer", "admin"), updateOrderStatus);

// Order cancellation by customer
router.route("/:id/cancel").put(protect, cancelMyOrder);

export default router;
