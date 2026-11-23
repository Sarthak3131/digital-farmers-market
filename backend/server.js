import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import auctionRoutes from "./routes/auctionRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

dotenv.config();

// Initialize App & Server
const app = express();
const httpServer = createServer(app);

// CORS Configuration
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors({
  origin: "*",
  credentials: true
}));
app.use(express.json());

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

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/auctions", auctionRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/orders", orderRoutes);

// Global Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Socket.io Logic
app.set("io", io);

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("join_auction", (room) => {
    socket.join(room);
    console.log(`User joined auction: ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
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
