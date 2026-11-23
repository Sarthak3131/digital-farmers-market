import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";

import User from "./models/User.js";
import Auction from "./models/Auction.js";
import authRoutes from "./routes/authRoutes.js";
import auctionRoutes from "./routes/auctionRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { globalApiLimiter } from "./middleware/rateLimiter.js";
import { mongoSanitize } from "./middleware/mongoSanitize.js";

dotenv.config();

// Initialize App & Server
const app = express();
const httpServer = createServer(app);

// Environment-based explicit CORS origins (SEC-06)
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5000",
  "http://127.0.0.1:5000"
];

const envAllowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
  : [];

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser callers (curl, postman, server-to-server) with undefined origin
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS error: Origin '${origin}' is not allowed by CORS policy.`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-bypass-ratelimit"]
};

// CORS Configuration for Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

app.use(cors(corsOptions));
app.use(express.json());
// SEC-07: Sanitize user input against NoSQL operator injection
app.use(mongoSanitize());

// Health and root endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "TerraFresh Digital Farmers Market API running successfully",
    version: "1.0.0"
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Apply global API rate limiter
app.use("/api", globalApiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auctions", auctionRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);

// Global Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Socket.io JWT Handshake Authentication Middleware (SEC-04)
io.use(async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return next(new Error("Authentication error: Missing token"));
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret_key_here_change_in_production"
    );

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    if (user.isActive === false) {
      return next(new Error("Authentication error: Account deactivated"));
    }

    socket.user = user;
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid or expired token"));
  }
});

// Socket.io Logic
app.set("io", io);

io.on("connection", (socket) => {
  const userId = socket.user._id.toString();
  const role = socket.user.role;

  // Join personal user room for private isolated notifications
  socket.join(`user_${userId}`);

  // Role-based room assignment
  if (role === "admin") {
    socket.join("admin_room");
  } else if (role === "farmer") {
    socket.join("farmer_room");
  }

  // Validated and authorized room joining for auctions
  socket.on("join_auction", async (auctionId, callback) => {
    try {
      if (!auctionId || typeof auctionId !== "string" || !mongoose.Types.ObjectId.isValid(auctionId)) {
        if (typeof callback === "function") callback({ error: "Invalid auction room identifier" });
        return socket.emit("error_message", { message: "Invalid auction room identifier" });
      }

      const auction = await Auction.findById(auctionId);
      if (!auction) {
        if (typeof callback === "function") callback({ error: "Auction not found" });
        return socket.emit("error_message", { message: "Auction not found" });
      }

      socket.join(auctionId);
      if (typeof callback === "function") callback({ success: true, room: auctionId });
    } catch (err) {
      if (typeof callback === "function") callback({ error: "Failed to join auction room" });
    }
  });

  socket.on("disconnect", () => {
    // Client disconnected
  });
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    console.log("MongoDB Connected");

    // Standard Port Configuration
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, "0.0.0.0", () =>
      console.log(`Server running on port ${PORT} (0.0.0.0)`)
    );
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
};

startServer();
