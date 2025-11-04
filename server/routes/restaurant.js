import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Restaurant from "../models/Restaurant.js";
import {
  authenticate,
  requireAdmin,
  requireRestaurant,
  optionalAuth,
} from "../middleware/auth.js";
import { authLimiter, registerLimiter } from "../middleware/rateLimiter.js";
import {
  validateRestaurantRegistration,
  validateLogin,
  sanitizeInput,
} from "../middleware/validation.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

const router = express.Router();

// Register new restaurant
router.post(
  "/register",
  registerLimiter,
  sanitizeInput,
  validateRestaurantRegistration,
  async (req, res) => {
    try {
      const {
        restaurantName,
        businessType,
        cuisineType,
        description,
        address,
        phone,
        owner,
        verification,
        website,
        socialMedia,
        operatingHours,
        numberOfTables,
      } = req.body;

      // Check if email already exists
      const existingEmail = await Restaurant.findOne({
        "owner.email": owner.email,
      });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(owner.password, 10);

      // Create restaurant
      const restaurant = await Restaurant.create({
        restaurantName,
        businessType,
        cuisineType,
        description,
        address,
        phone,
        owner: {
          name: owner.name,
          email: owner.email,
          phone: owner.phone,
          passwordHash,
        },
        verification: {
          businessLicense: verification.businessLicense,
          taxId: verification.taxId,
          documents: verification.documents || [],
          status: "pending",
        },
        website,
        socialMedia,
        operatingHours,
        numberOfTables,
      });

      res.status(201).json({
        message: "Restaurant registration submitted successfully",
        restaurantId: restaurant._id,
        status: "pending",
      });
    } catch (error) {
      console.error("Restaurant registration error:", error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Restaurant login
router.post(
  "/login",
  authLimiter,
  sanitizeInput,
  validateLogin,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const restaurant = await Restaurant.findOne({ "owner.email": email });
      if (!restaurant) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(
        password,
        restaurant.owner.passwordHash
      );
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign(
        { restaurantId: restaurant._id, type: "restaurant" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        restaurant: {
          _id: restaurant._id,
          restaurantName: restaurant.restaurantName,
          email: restaurant.owner.email,
          verificationStatus: restaurant.verification.status,
          isActive: restaurant.isActive,
        },
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Get restaurant profile
router.get("/me", authenticate, requireRestaurant, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId).select(
      "-owner.passwordHash"
    );
    if (!restaurant) {
      return res.status(404).json({
        message: "Restaurant not found",
        code: "RESTAURANT_NOT_FOUND",
      });
    }

    res.json(restaurant);
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch restaurant data",
      code: "FETCH_ERROR",
    });
  }
});

// Update restaurant profile
router.patch(
  "/profile",
  authenticate,
  requireRestaurant,
  sanitizeInput,
  async (req, res) => {
    try {
      const updates = req.body;
      delete updates.verification; // Can't update verification directly
      delete updates.owner; // Can't update owner directly
      delete updates.isActive; // Can't update active status directly

      const restaurant = await Restaurant.findByIdAndUpdate(
        req.restaurantId,
        updates,
        { new: true, runValidators: true }
      ).select("-owner.passwordHash");

      res.json(restaurant);
    } catch (error) {
      res.status(500).json({
        message: "Failed to update restaurant profile",
        code: "UPDATE_ERROR",
      });
    }
  }
);

// Admin: Get all restaurants
router.get("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { "verification.status": status } : {};

    const restaurants = await Restaurant.find(query)
      .select("-owner.passwordHash")
      .sort("-createdAt");

    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: Get pending applications
router.get("/pending", authenticate, requireAdmin, async (req, res) => {
  try {
    const restaurants = await Restaurant.find({
      "verification.status": "pending",
    })
      .select("-owner.passwordHash")
      .sort("-createdAt");

    res.json(restaurants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get restaurant and table info by QR slug (public for QR menu viewing)
router.get("/qr/:qrSlug", async (req, res) => {
  try {
    const { qrSlug } = req.params;

    // Import Table model
    const Table = (await import("../models/Table.js")).default;

    // Find table by QR slug
    const table = await Table.findOne({ qrSlug });

    if (!table) {
      return res.status(404).json({ message: "Invalid QR code" });
    }

    // Get restaurant info
    const restaurant = await Restaurant.findById(table.restaurantId).select(
      "-owner.passwordHash"
    );

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Return table and restaurant info
    res.json({
      tableNumber: table.number,
      restaurantId: restaurant._id,
      restaurantName: restaurant.restaurantName,
      qrSlug: table.qrSlug,
    });
  } catch (error) {
    console.error("Error fetching QR info:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get restaurant by ID (public for menu viewing)
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select(
      "-owner.passwordHash"
    );

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.json(restaurant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: Approve/Reject restaurant
router.patch(
  "/:id/verify",
  authenticate,
  requireAdmin,
  sanitizeInput,
  async (req, res) => {
    try {
      const { status, rejectionReason, notes } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const restaurant = await Restaurant.findByIdAndUpdate(
        req.params.id,
        {
          "verification.status": status,
          "verification.reviewedBy": req.user._id,
          "verification.reviewedAt": new Date(),
          "verification.rejectionReason": rejectionReason,
          "verification.notes": notes,
          isActive: status === "approved",
        },
        { new: true }
      ).select("-owner.passwordHash");

      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }

      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

// Forgot Password - Send reset email
router.post("/forgot-password", sanitizeInput, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
        code: "EMAIL_REQUIRED",
      });
    }

    const restaurant = await Restaurant.findOne({ "owner.email": email });

    // Don't reveal if email exists (security best practice)
    if (!restaurant) {
      return res.json({
        message:
          "If an account exists with this email, you will receive a password reset code",
        code: "RESET_EMAIL_SENT",
      });
    }

    // Generate reset token (6-digit code)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the token before storing
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Save token and expiry (1 hour from now)
    restaurant.owner.resetPasswordToken = hashedToken;
    restaurant.owner.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await restaurant.save();

    // Send email with reset code (non-blocking)
    sendPasswordResetEmail(email, resetToken, restaurant.owner.name)
      .then(() => console.log("✅ Password reset email sent successfully"))
      .catch((emailError) =>
        console.error("❌ Failed to send email:", emailError)
      );

    // Respond immediately without waiting for email
    res.json({
      message:
        "If an account exists with this email, you will receive a password reset code",
      code: "RESET_EMAIL_SENT",
      // For development/testing - shows token in response
      devToken: resetToken, // Always show for now since email might not work
    });
  } catch (error) {
    console.error("Restaurant forgot password error:", error);
    res.status(500).json({
      message: "Failed to process password reset request",
      code: "RESET_ERROR",
    });
  }
});

// Reset Password - Verify token and update password
router.post("/reset-password", sanitizeInput, async (req, res) => {
  try {
    const { token, password, email } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        message: "Token and password are required",
        code: "MISSING_FIELDS",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
        code: "PASSWORD_TOO_SHORT",
      });
    }

    // Find restaurant with valid reset token
    const restaurant = await Restaurant.findOne({
      "owner.email": email,
      "owner.resetPasswordExpires": { $gt: Date.now() },
    });

    if (!restaurant || !restaurant.owner.resetPasswordToken) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    // Verify token
    const isValidToken = await bcrypt.compare(
      token,
      restaurant.owner.resetPasswordToken
    );

    if (!isValidToken) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    // Update password
    restaurant.owner.passwordHash = await bcrypt.hash(password, 10);
    restaurant.owner.resetPasswordToken = undefined;
    restaurant.owner.resetPasswordExpires = undefined;
    await restaurant.save();

    console.log("\n=================================");
    console.log("PASSWORD RESET SUCCESSFUL FOR:", restaurant.owner.email);
    console.log("Restaurant:", restaurant.restaurantName);
    console.log("=================================\n");

    res.json({
      message:
        "Password reset successful. You can now login with your new password.",
      code: "PASSWORD_RESET_SUCCESS",
    });
  } catch (error) {
    console.error("Restaurant reset password error:", error);
    res.status(500).json({
      message: "Failed to reset password",
      code: "RESET_ERROR",
    });
  }
});

// Verify Reset Token - Check if token is valid
router.post("/verify-reset-token", sanitizeInput, async (req, res) => {
  try {
    const { token, email } = req.body;

    if (!token || !email) {
      return res.status(400).json({
        message: "Token and email are required",
        code: "MISSING_FIELDS",
      });
    }

    const restaurant = await Restaurant.findOne({
      "owner.email": email,
      "owner.resetPasswordExpires": { $gt: Date.now() },
    });

    if (!restaurant || !restaurant.owner.resetPasswordToken) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    const isValidToken = await bcrypt.compare(
      token,
      restaurant.owner.resetPasswordToken
    );

    if (!isValidToken) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    res.json({
      message: "Token is valid",
      code: "TOKEN_VALID",
    });
  } catch (error) {
    console.error("Restaurant verify token error:", error);
    res.status(500).json({
      message: "Failed to verify token",
      code: "VERIFY_ERROR",
    });
  }
});

export default router;
