import express from "express";
import {
  createAuction,
  placeBid,
  getAuction,
  getSellerAuctions,
  getAllAuctions,
  getRecentBids,
} from "../controllers/auctionController.js";
import { protect } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";
import { bidRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// Public routes
router.get("/feed", getRecentBids);
router.get("/", getAllAuctions);
router.get("/:id", getAuction);

// Protected routes
router.post("/create", protect, roleMiddleware("farmer", "admin"), createAuction);
router.post("/bid", protect, bidRateLimiter, placeBid);
router.get("/seller", protect, roleMiddleware("farmer", "admin"), getSellerAuctions);

export default router;
