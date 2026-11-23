import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import jwt from "jsonwebtoken";

dotenv.config();

const BASE_URL = "http://127.0.0.1:5000";

describe("SEC-05: Farmer Order Ownership Enforcement", () => {
  let farmerAToken;
  let farmerBToken;
  let adminToken;
  let farmerA;
  let farmerB;
  let adminUser;
  let buyerUser;
  let productA;
  let productB;
  let orderFarmerA;
  let orderMultiFarmer;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/digital-farmers-market");
    }

    const secret = process.env.JWT_SECRET || "your_jwt_secret_key_here_change_in_production";

    // Retrieve or create two distinct farmers
    farmerA = await User.findOne({ email: "rajesh@farm.com" });
    farmerB = await User.findOne({ email: "suresh@farm.com" });
    adminUser = await User.findOne({ role: "admin" });
    buyerUser = await User.findOne({ role: "consumer" });

    assert.ok(farmerA, "Farmer A (rajesh) must exist");
    assert.ok(farmerB, "Farmer B (suresh) must exist");
    assert.ok(adminUser, "Admin must exist");
    assert.ok(buyerUser, "Consumer must exist");

    farmerAToken = jwt.sign({ id: farmerA._id, role: farmerA.role }, secret, { expiresIn: "1h" });
    farmerBToken = jwt.sign({ id: farmerB._id, role: farmerB.role }, secret, { expiresIn: "1h" });
    adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, secret, { expiresIn: "1h" });

    // Create test products
    productA = await Product.create({
      name: "SEC-05 Organic Mangoes by Rajesh",
      category: "Fruits",
      price: 200,
      stock: 50,
      unit: "kg",
      seller: farmerA._id,
      status: "available",
      originState: "Maharashtra"
    });

    productB = await Product.create({
      name: "SEC-05 Wheat Grain by Suresh",
      category: "Grains",
      price: 60,
      stock: 100,
      unit: "kg",
      seller: farmerB._id,
      status: "available",
      originState: "Punjab"
    });

    // Create single-farmer order for Farmer A
    orderFarmerA = await Order.create({
      buyer: buyerUser._id,
      items: [
        {
          product: productA._id,
          seller: farmerA._id,
          name: productA.name,
          quantity: 2,
          price: 200,
          unit: "kg"
        }
      ],
      subtotal: 400,
      tax: 20,
      deliveryFee: 40,
      platformFee: 10,
      totalAmount: 470,
      shippingAddress: {
        name: "Test Consumer",
        phone: "9988776655",
        address: "456 Test Ave",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
        instructions: "SEC-05-TEST"
      },
      status: "pending",
      paymentMethod: "COD",
      paymentStatus: "pending",
      trackingId: `TF-SEC05-A-${Date.now()}`
    });

    // Create multi-farmer order containing items from both Farmer A and Farmer B
    orderMultiFarmer = await Order.create({
      buyer: buyerUser._id,
      items: [
        {
          product: productA._id,
          seller: farmerA._id,
          name: productA.name,
          quantity: 1,
          price: 200,
          unit: "kg"
        },
        {
          product: productB._id,
          seller: farmerB._id,
          name: productB.name,
          quantity: 2,
          price: 60,
          unit: "kg"
        }
      ],
      subtotal: 320,
      tax: 16,
      deliveryFee: 40,
      platformFee: 8,
      totalAmount: 384,
      shippingAddress: {
        name: "Test Consumer",
        phone: "9988776655",
        address: "456 Test Ave",
        city: "Pune",
        state: "Maharashtra",
        pincode: "411001",
        instructions: "SEC-05-TEST"
      },
      status: "pending",
      paymentMethod: "COD",
      paymentStatus: "pending",
      trackingId: `TF-SEC05-MULTI-${Date.now()}`
    });
  });

  after(async () => {
    if (productA) await Product.findByIdAndDelete(productA._id);
    if (productB) await Product.findByIdAndDelete(productB._id);
    if (orderFarmerA) await Order.findByIdAndDelete(orderFarmerA._id);
    if (orderMultiFarmer) await Order.findByIdAndDelete(orderMultiFarmer._id);
    await mongoose.disconnect();
  });

  test("Farmer B cannot update an order containing exclusively Farmer A's produce (HTTP 403)", async () => {
    const res = await fetch(`${BASE_URL}/api/orders/${orderFarmerA._id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerBToken}`
      },
      body: JSON.stringify({ status: "shipped" })
    });

    assert.strictEqual(res.status, 403, "Must reject unauthorized farmer with HTTP 403 Forbidden");
    const data = await res.json();
    assert.match(data.message, /Forbidden.*not authorized/i);
  });

  test("Farmer A can successfully update order status for their own produce (HTTP 200)", async () => {
    const res = await fetch(`${BASE_URL}/api/orders/${orderFarmerA._id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerAToken}`
      },
      body: JSON.stringify({ status: "processing" })
    });

    assert.strictEqual(res.status, 200, "Authorized farmer should successfully update order");
    const data = await res.json();
    assert.strictEqual(data.status, "processing");
  });

  test("Farmer A cannot update a multi-farmer order containing other sellers' goods (HTTP 403)", async () => {
    const res = await fetch(`${BASE_URL}/api/orders/${orderMultiFarmer._id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${farmerAToken}`
      },
      body: JSON.stringify({ status: "shipped" })
    });

    assert.strictEqual(res.status, 403, "Farmer cannot update multi-seller order");
    const data = await res.json();
    assert.match(data.message, /multiple sellers/i);
  });

  test("Admin can update any order (including multi-farmer orders) (HTTP 200)", async () => {
    const res = await fetch(`${BASE_URL}/api/orders/${orderMultiFarmer._id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: "shipped" })
    });

    assert.strictEqual(res.status, 200, "Admin must be authorized to update multi-seller orders");
    const data = await res.json();
    assert.strictEqual(data.status, "shipped");
  });
});
