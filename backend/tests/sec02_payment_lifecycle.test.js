import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

dotenv.config();

const BASE_URL = "http://127.0.0.1:5000";

describe("SEC-02: Payment Lifecycle & Mock Gateway Mode", () => {
  let buyerToken;
  let otherBuyerToken;
  let buyerUser;
  let otherBuyerUser;
  let sellerUser;
  let testProduct;
  let createdOrderId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/digital-farmers-market");
    }

    const secret = process.env.JWT_SECRET || "your_jwt_secret_key_here_change_in_production";

    buyerUser = await User.findOne({ role: "consumer" });
    sellerUser = await User.findOne({ role: "farmer" });

    // Create a second consumer to test authorization
    otherBuyerUser = await User.create({
      name: "Second Buyer",
      email: `buyer2_${Date.now()}@test.com`,
      password: "password123",
      role: "consumer"
    });

    buyerToken = jwt.sign({ id: buyerUser._id, role: buyerUser.role }, secret, { expiresIn: "1h" });
    otherBuyerToken = jwt.sign({ id: otherBuyerUser._id, role: otherBuyerUser.role }, secret, { expiresIn: "1h" });

    testProduct = await Product.create({
      name: "SEC-02 Premium Organic Honey",
      category: "Organic",
      price: 350,
      stock: 50,
      unit: "jar",
      seller: sellerUser._id,
      status: "available",
      originState: "Uttarakhand"
    });
  });

  after(async () => {
    if (otherBuyerUser) await User.findByIdAndDelete(otherBuyerUser._id);
    if (testProduct) await Product.findByIdAndDelete(testProduct._id);
    if (createdOrderId) await Order.findByIdAndDelete(createdOrderId);
    await mongoose.disconnect();
  });

  test("Card/UPI orders are created with paymentStatus 'pending', NEVER prematurely 'completed'", async () => {
    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        items: [
          {
            product: testProduct._id.toString(),
            name: testProduct.name,
            quantity: 1,
            price: 350
          }
        ],
        shippingAddress: {
          name: "Test Buyer",
          phone: "9876543210",
          address: "123 Farm Road",
          city: "Dehradun",
          state: "Uttarakhand",
          pincode: "248001"
        },
        paymentMethod: "UPI"
      })
    });

    assert.strictEqual(res.status, 201, "Order creation should succeed");
    const orderData = await res.json();
    createdOrderId = orderData._id;

    assert.strictEqual(
      orderData.paymentStatus,
      "pending",
      "Payment status must be 'pending' even though paymentMethod is UPI"
    );
  });

  test("Unauthorized user cannot confirm payment for someone else's order (HTTP 403)", async () => {
    const res = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/confirm-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${otherBuyerToken}`
      },
      body: JSON.stringify({
        transactionId: "TXN-ATTACK-123",
        gateway: "MOCK_PAYMENT_GATEWAY"
      })
    });

    assert.strictEqual(res.status, 403, "Must reject payment confirmation from unauthorized user");
  });

  test("Buyer can confirm payment via explicit development mock gateway endpoint", async () => {
    const res = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/confirm-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        transactionId: "TXN-MOCK-VALID-999",
        gateway: "MOCK_PAYMENT_GATEWAY"
      })
    });

    assert.strictEqual(res.status, 200, "Authorized confirmation must succeed");
    const data = await res.json();

    assert.strictEqual(data.mode, "DEVELOPMENT_MOCK_SANDBOX", "Must specify mock development mode");
    assert.strictEqual(data.order.paymentStatus, "completed");
    assert.strictEqual(data.order.status, "processing");
  });

  test("Cannot confirm payment twice on an already completed order (HTTP 400)", async () => {
    const res = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/confirm-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`
      },
      body: JSON.stringify({
        transactionId: "TXN-MOCK-DUPLICATE",
        gateway: "MOCK_PAYMENT_GATEWAY"
      })
    });

    assert.strictEqual(res.status, 400, "Must reject duplicate payment confirmation");
  });
});
