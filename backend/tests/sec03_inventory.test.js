import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import jwt from "jsonwebtoken";

dotenv.config();

const BASE_URL = "http://127.0.0.1:5000";

describe("SEC-03: Inventory Overselling & Multi-Product Atomic Deduction", () => {
  let buyerToken;
  let buyerUser;
  let sellerUser;
  let testProduct1;
  let testProduct2;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/digital-farmers-market");
    }

    // Fetch or create users
    sellerUser = await User.findOne({ role: "farmer" });
    buyerUser = await User.findOne({ role: "consumer" });

    assert.ok(sellerUser, "Farmer user should exist");
    assert.ok(buyerUser, "Consumer user should exist");

    buyerToken = jwt.sign(
      { id: buyerUser._id, role: buyerUser.role },
      process.env.JWT_SECRET || "your_jwt_secret_key_here_change_in_production",
      { expiresIn: "1h" }
    );
  });

  after(async () => {
    // Clean up test products
    if (testProduct1) await Product.findByIdAndDelete(testProduct1._id);
    if (testProduct2) await Product.findByIdAndDelete(testProduct2._id);
    await Order.deleteMany({ "shippingAddress.instructions": "SEC-03-TEST" });
    await mongoose.disconnect();
  });

  test("Concurrent requests for last-item stock do not oversell into negative numbers", async () => {
    // Create a product with exactly 10 units in stock
    testProduct1 = await Product.create({
      name: "SEC-03 Contention Organic Apples",
      category: "Fruits",
      price: 100,
      stock: 10,
      unit: "kg",
      seller: sellerUser._id,
      status: "available",
      originState: "Himachal Pradesh"
    });

    const createOrderPayload = {
      items: [
        {
          product: testProduct1._id.toString(),
          name: testProduct1.name,
          quantity: 5,
          price: 100
        }
      ],
      shippingAddress: {
        name: "Test Buyer",
        phone: "9876543210",
        address: "123 Test St",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        instructions: "SEC-03-TEST"
      },
      paymentMethod: "COD"
    };

    // Fire 4 concurrent requests, each asking for 5 units (total 20 requested on 10 available)
    const requests = [1, 2, 3, 4].map(() =>
      fetch(`${BASE_URL}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${buyerToken}`
        },
        body: JSON.stringify(createOrderPayload)
      })
    );

    const responses = await Promise.all(requests);
    const statuses = responses.map((r) => r.status);

    const successCount = statuses.filter((s) => s === 201).length;
    const failureCount = statuses.filter((s) => s === 400).length;

    assert.strictEqual(successCount, 2, "Exactly 2 concurrent orders should succeed (10 stock / 5 each = 2)");
    assert.strictEqual(failureCount, 2, "The other 2 concurrent orders should fail with HTTP 400");

    // Verify product stock in database
    const refreshedProduct = await Product.findById(testProduct1._id);
    assert.strictEqual(refreshedProduct.stock, 0, "Final stock must be exactly 0, never negative");
    assert.strictEqual(refreshedProduct.status, "sold_out", "Product status should be sold_out when stock reaches 0");
  });

  test("Multi-product order rolls back previously deducted stock if a subsequent item is out of stock", async () => {
    // Product A: 15 in stock
    testProduct1 = await Product.create({
      name: "SEC-03 Multi-item Available Oranges",
      category: "Fruits",
      price: 80,
      stock: 15,
      unit: "kg",
      seller: sellerUser._id,
      status: "available",
      originState: "Maharashtra"
    });

    // Product B: 0 in stock (out of stock)
    testProduct2 = await Product.create({
      name: "SEC-03 Multi-item Out-of-Stock Grapes",
      category: "Fruits",
      price: 120,
      stock: 0,
      unit: "kg",
      seller: sellerUser._id,
      status: "sold_out",
      originState: "Maharashtra"
    });

    const multiItemPayload = {
      items: [
        {
          product: testProduct1._id.toString(),
          name: testProduct1.name,
          quantity: 5,
          price: 80
        },
        {
          product: testProduct2._id.toString(),
          name: testProduct2.name,
          quantity: 2,
          price: 120
        }
      ],
      shippingAddress: {
        name: "Test Buyer",
        phone: "9876543210",
        address: "123 Test St",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        instructions: "SEC-03-TEST"
      },
      paymentMethod: "COD"
    };

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${buyerToken}`
      },
      body: JSON.stringify(multiItemPayload)
    });

    assert.strictEqual(res.status, 400, "Order must fail with HTTP 400 due to out of stock item");

    // Verify Product A stock was NOT permanently deducted
    const refreshedProduct1 = await Product.findById(testProduct1._id);
    assert.strictEqual(refreshedProduct1.stock, 15, "Product A stock must remain at 15 after rollback");
  });
});
