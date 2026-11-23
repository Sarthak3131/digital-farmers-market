import bcrypt from "bcryptjs";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { createNotification } from "./adminController.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // SEC-07: Validate input types and presence
    if (
      !name || typeof name !== "string" || !name.trim() ||
      !email || typeof email !== "string" || !email.trim() ||
      !password || typeof password !== "string"
    ) {
      return res.status(400).json({ message: "Valid name, email, and password strings are required" });
    }

    // Security: Prevent privilege escalation to admin via registration
    const normalizedRole = role ? role.toLowerCase().trim() : "consumer";
    if (normalizedRole === "admin" || !["consumer", "farmer"].includes(normalizedRole)) {
      return res.status(400).json({
        message: "Invalid role specified. Self-registration is restricted to consumer or farmer roles only."
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashed,
      role: normalizedRole,
      isVerified: normalizedRole === "farmer" ? false : true,
      isActive: true
    });

    if (user) {
      // Notify Admin if Farmer Registers
      if (normalizedRole === 'farmer') {
        const notif = await createNotification(
          "New Farmer Registration",
          `Farmer ${user.name} has registered and awaits verification.`,
          "warning",
          "/admin/farmer-verification"
        );

        const io = req.app.get("io");
        if (io && notif) {
          io.emit("admin_notification", notif);
        }
      }

      res.status(201).json({
        token: generateToken(user._id, user.role),
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          isActive: user.isActive
        }
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // SEC-07: Validate input types and presence
    if (!email || typeof email !== "string" || !email.trim() || !password || typeof password !== "string") {
      return res.status(400).json({ message: "Valid email and password strings are required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account has been deactivated. Please contact support." });
    }

    res.json({
      token: generateToken(user._id, user.role),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Get current user profile / verify session
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
