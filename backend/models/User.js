import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["consumer", "farmer", "admin"],
      default: "consumer",
    },
    // Governance Fields
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false, // For Farmers
    },

    // Farmer Profile Fields
    farmName: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      default: "",
    },

    // Verification Documents
    documents: [
      {
        docType: { type: String, default: "Aadhar" },
        url: { type: String, default: "" },
        status: {
          type: String,
          enum: ["pending", "valid", "rejected"],
          default: "pending",
        },
        idNumber: { type: String, default: "" },
        submittedAt: { type: Date, default: Date.now },
      },
    ],

    riskScore: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
