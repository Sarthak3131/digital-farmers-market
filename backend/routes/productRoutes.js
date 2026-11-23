import express from "express";
import {
  getProducts,
  getProductById,
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { protect } from "../middleware/authMiddleware.js";
import roleMiddleware from "../middleware/roleMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getProducts);
router.get("/my", protect, roleMiddleware("farmer", "admin"), getMyProducts);
router.get("/:id", getProductById);

// Farmer & Admin protected routes
router.post("/", protect, roleMiddleware("farmer", "admin"), createProduct);
router.put("/:id", protect, roleMiddleware("farmer", "admin"), updateProduct);
router.delete("/:id", protect, roleMiddleware("farmer", "admin"), deleteProduct);

export default router;
