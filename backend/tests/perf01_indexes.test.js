import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Auction from "../models/Auction.js";
import Bid from "../models/Bid.js";

dotenv.config();

describe("PERF-01: Justified MongoDB Indexes", () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/digital-farmers-market");
    }

    // Sync all indexes with the live database
    await Promise.all([
      User.syncIndexes(),
      Product.syncIndexes(),
      Order.syncIndexes(),
      Auction.syncIndexes(),
      Bid.syncIndexes()
    ]);
  });

  after(async () => {
    await mongoose.disconnect();
  });

  test("User collection has compound governance index and unique email index without duplicates", async () => {
    const indexes = await User.collection.indexes();
    const indexNames = indexes.map((idx) => idx.name);

    assert.ok(indexNames.includes("email_1"), "Unique email index must exist");
    assert.ok(indexNames.includes("role_1_isVerified_1_isActive_1"), "Role governance compound index must exist");
  });

  test("Product collection has compound seller, catalog filter, and text indexes", async () => {
    const indexes = await Product.collection.indexes();
    const indexNames = indexes.map((idx) => idx.name);

    assert.ok(indexNames.includes("seller_1_createdAt_-1"), "Seller inventory compound index must exist");
    assert.ok(indexNames.includes("category_1_status_1_price_1"), "Catalog query compound index must exist");
    assert.ok(indexNames.includes("name_text_description_text"), "Text search index must exist");
  });

  test("Order collection has buyer history, farmer fulfillment, status, and unique trackingId indexes", async () => {
    const indexes = await Order.collection.indexes();
    const indexNames = indexes.map((idx) => idx.name);

    assert.ok(indexNames.includes("buyer_1_createdAt_-1"), "Buyer order history index must exist");
    assert.ok(indexNames.includes("items.seller_1_createdAt_-1"), "Farmer fulfillment index must exist");
    assert.ok(indexNames.includes("status_1_createdAt_-1"), "Order status index must exist");
    assert.ok(indexNames.includes("trackingId_1"), "Unique trackingId index must exist");
  });

  test("Auction and Bid collections have active feeds and bid history indexes", async () => {
    const auctionIndexes = await Auction.collection.indexes();
    const auctionIdxNames = auctionIndexes.map((idx) => idx.name);

    assert.ok(auctionIdxNames.includes("status_1_endTime_1"), "Auction feed index must exist");
    assert.ok(auctionIdxNames.includes("seller_1_createdAt_-1"), "Seller auction index must exist");

    const bidIndexes = await Bid.collection.indexes();
    const bidIdxNames = bidIndexes.map((idx) => idx.name);

    assert.ok(bidIdxNames.includes("auction_1_createdAt_-1"), "Bid history compound index must exist");
  });
});
