import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Auction from "../models/Auction.js";
import Product from "../models/Product.js";
import { io as ioClient } from "../../frontent/node_modules/socket.io-client/build/esm/index.js";

dotenv.config();

const SOCKET_URL = "http://127.0.0.1:5000";
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key_here_change_in_production";

describe("SEC-04: Socket.io JWT Handshake Auth & Room Authorization", () => {
  let validToken;
  let deactivatedUser;
  let deactivatedToken;
  let testAuction;
  let testProduct;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/digital-farmers-market");
    }

    const regularUser = await User.findOne({ role: "consumer" });
    assert.ok(regularUser, "A consumer user must exist");
    validToken = jwt.sign({ id: regularUser._id, role: regularUser.role }, JWT_SECRET, { expiresIn: "1h" });

    // Create a deactivated user to test status checking
    deactivatedUser = await User.create({
      name: "Deactivated Test User",
      email: `deactivated_${Date.now()}@test.com`,
      password: "password123",
      role: "consumer",
      isActive: false
    });
    deactivatedToken = jwt.sign({ id: deactivatedUser._id, role: deactivatedUser.role }, JWT_SECRET, { expiresIn: "1h" });

    const farmer = await User.findOne({ role: "farmer" });
    testProduct = await Product.create({
      name: "SEC-04 Live Bidding Produce",
      category: "Vegetables",
      price: 50,
      stock: 100,
      unit: "kg",
      seller: farmer._id,
      status: "available",
      originState: "Punjab"
    });

    testAuction = await Auction.create({
      product: testProduct._id,
      seller: farmer._id,
      startingPrice: 50,
      currentPrice: 50,
      bidIncrement: 10,
      endTime: new Date(Date.now() + 3600000),
      status: "active"
    });
  });

  after(async () => {
    if (deactivatedUser) await User.findByIdAndDelete(deactivatedUser._id);
    if (testProduct) await Product.findByIdAndDelete(testProduct._id);
    if (testAuction) await Auction.findByIdAndDelete(testAuction._id);
    await mongoose.disconnect();
  });

  test("Reject connection when no token is provided in handshake", async () => {
    await new Promise((resolve) => {
      const socket = ioClient(SOCKET_URL, {
        transports: ["websocket"],
        reconnection: false
      });

      socket.on("connect_error", (err) => {
        assert.match(err.message, /Authentication error.*Missing token/i);
        socket.disconnect();
        resolve();
      });

      socket.on("connect", () => {
        socket.disconnect();
        assert.fail("Unauthenticated socket should not have connected");
        resolve();
      });
    });
  });

  test("Reject connection when token is invalid or corrupted", async () => {
    await new Promise((resolve) => {
      const socket = ioClient(SOCKET_URL, {
        auth: { token: "invalid.token.signature" },
        transports: ["websocket"],
        reconnection: false
      });

      socket.on("connect_error", (err) => {
        assert.match(err.message, /Authentication error/i);
        socket.disconnect();
        resolve();
      });

      socket.on("connect", () => {
        socket.disconnect();
        assert.fail("Corrupted token socket should not have connected");
        resolve();
      });
    });
  });

  test("Reject connection when account is deactivated (isActive: false)", async () => {
    await new Promise((resolve) => {
      const socket = ioClient(SOCKET_URL, {
        auth: { token: deactivatedToken },
        transports: ["websocket"],
        reconnection: false
      });

      socket.on("connect_error", (err) => {
        assert.match(err.message, /Authentication error.*deactivated/i);
        socket.disconnect();
        resolve();
      });

      socket.on("connect", () => {
        socket.disconnect();
        assert.fail("Deactivated user should not connect to socket");
        resolve();
      });
    });
  });

  test("Successfully connect with valid JWT token", async () => {
    await new Promise((resolve) => {
      const socket = ioClient(SOCKET_URL, {
        auth: { token: validToken },
        transports: ["websocket"],
        reconnection: false
      });

      socket.on("connect", () => {
        assert.ok(socket.id, "Socket should have an ID upon connection");
        socket.disconnect();
        resolve();
      });

      socket.on("connect_error", (err) => {
        socket.disconnect();
        assert.fail(`Valid socket connection failed: ${err.message}`);
        resolve();
      });
    });
  });

  test("Reject joining invalid or non-existent auction room", async () => {
    await new Promise((resolve) => {
      const socket = ioClient(SOCKET_URL, {
        auth: { token: validToken },
        transports: ["websocket"],
        reconnection: false
      });

      socket.on("connect", () => {
        socket.emit("join_auction", "invalid-room-id", (response) => {
          assert.ok(response && response.error, "Should receive error for invalid room id format");
          socket.disconnect();
          resolve();
        });
      });
    });
  });

  test("Successfully join valid existing auction room", async () => {
    await new Promise((resolve) => {
      const socket = ioClient(SOCKET_URL, {
        auth: { token: validToken },
        transports: ["websocket"],
        reconnection: false
      });

      socket.on("connect", () => {
        socket.emit("join_auction", testAuction._id.toString(), (response) => {
          assert.strictEqual(response?.success, true, "Should successfully join valid auction room");
          assert.strictEqual(response?.room, testAuction._id.toString());
          socket.disconnect();
          resolve();
        });
      });
    });
  });
});
