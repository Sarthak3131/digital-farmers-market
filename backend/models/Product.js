import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      enum: [
        "Vegetables",
        "Fruits",
        "Grains",
        "Dairy",
        "Organic",
        "Seeds",
        "Spices",
        "Herbs",
        "Exotic",
        "Other",
      ],
      default: "Vegetables",
      index: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      default: 1,
    },
    stock: {
      type: Number,
      default: 50,
      min: 0,
    },
    unit: {
      type: String, // 'kg', 'bunch', 'pack', 'pc', 'liter', 'dozen'
      default: "kg",
    },
    grade: {
      type: String, // 'A+', 'A', 'B', 'Organic', 'Export Quality'
      default: "A",
    },
    status: {
      type: String,
      enum: ["available", "low_stock", "sold_out"],
      default: "available",
    },
    rating: {
      type: Number,
      default: 4.8,
      min: 0,
      max: 5,
    },
    reviewsCount: {
      type: Number,
      default: 15,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    harvestDate: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
