import mongoose from "mongoose";

const bidSchema = new mongoose.Schema(
  {
    auction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
    },
    bidder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// PERF-01: Compound index for retrieving auction bid history and counting
bidSchema.index({ auction: 1, createdAt: -1 });

export default mongoose.model("Bid", bidSchema);
