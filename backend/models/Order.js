import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        auction: { type: mongoose.Schema.Types.ObjectId, ref: "Auction" },
        seller: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: { type: String, required: true },
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true },
        image: { type: String },
        unit: { type: String, default: "kg" },
      },
    ],
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    shippingAddress: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      address: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      pincode: { type: String, default: "" },
      instructions: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "completed", "cancelled"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      default: "COD",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    trackingId: {
      type: String,
    },
  },
  { timestamps: true }
);

// PERF-01: Performance indexes for consumer orders, farmer fulfillment and tracking lookup
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ "items.seller": 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ trackingId: 1 }, { unique: true, sparse: true });

export default mongoose.model("Order", orderSchema);
