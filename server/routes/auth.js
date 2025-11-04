import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter, registerLimiter } from "../middleware/rateLimiter.js";
import {
  validateRegistration,
  validateLogin,
  sanitizeInput,
} from "../middleware/validation.js";
import { sendPasswordResetEmail } from "../services/emailService.js";

const router = express.Router();

router.post(
  "/register",
  registerLimiter,
  sanitizeInput,
  validateRegistration,
  async (req, res) => {
    try {
      const { name, email, phone, password, role, marketingConsent } = req.body;

      // Check if email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Check if phone already exists
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res
          .status(400)
          .json({ message: "Phone number already registered" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        name,
        email,
        phone,
        passwordHash,
        role: role || "customer",
        marketingConsent: marketingConsent || false,
      });

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      res.status(201).json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(500).json({
        message: "Registration failed",
        code: "REGISTRATION_ERROR",
      });
    }
  }
);

router.post(
  "/login",
  authLimiter,
  sanitizeInput,
  validateLogin,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          message: "Invalid credentials",
          code: "INVALID_CREDENTIALS",
        });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({
          message: "Invalid credentials",
          code: "INVALID_CREDENTIALS",
        });
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      res.json({
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(500).json({
        message: "Login failed",
        code: "LOGIN_ERROR",
      });
    }
  }
);

router.get("/me", authenticate, async (req, res) => {
  try {
    if (req.user) {
      res.json({
        user: req.user,
        type: "user",
      });
    } else if (req.restaurant) {
      res.json({
        restaurant: req.restaurant,
        type: "restaurant",
      });
    } else {
      res.status(401).json({
        message: "Not authenticated",
        code: "NOT_AUTHENTICATED",
      });
    }
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch user data",
      code: "FETCH_ERROR",
    });
  }
});

// Logout endpoint
router.post("/logout", authenticate, async (req, res) => {
  try {
    res.json({
      message: "Logged out successfully",
      code: "LOGOUT_SUCCESS",
    });
  } catch (error) {
    res.status(500).json({
      message: "Logout failed",
      code: "LOGOUT_ERROR",
    });
  }
});

// Token refresh endpoint
router.post("/refresh", authenticate, async (req, res) => {
  try {
    let newToken;

    if (req.userId) {
      newToken = jwt.sign({ userId: req.userId }, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
    } else if (req.restaurantId) {
      newToken = jwt.sign(
        { restaurantId: req.restaurantId, type: "restaurant" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
    } else {
      return res.status(401).json({
        message: "Invalid token",
        code: "INVALID_TOKEN",
      });
    }

    res.json({
      token: newToken,
      message: "Token refreshed successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Token refresh failed",
      code: "REFRESH_ERROR",
    });
  }
});

export default router;

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

    const user = await User.findOne({ email });

    // Don't reveal if email exists (security best practice)
    if (!user) {
      return res.json({
        message:
          "If an account exists with this email, you will receive a password reset code",
        code: "RESET_EMAIL_SENT",
      });
    }

    // Generate reset token (6-digit code for simplicity)
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash the token before storing
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Save token and expiry (1 hour from now)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send email with reset code (non-blocking)
    sendPasswordResetEmail(email, resetToken, user.name)
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
    console.error("Forgot password error:", error);
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

    // Find user with valid reset token
    const user = await User.findOne({
      email: email,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user || !user.resetPasswordToken) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    // Verify token
    const isValidToken = await bcrypt.compare(token, user.resetPasswordToken);

    if (!isValidToken) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    // Update password
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log("\n=================================");
    console.log("PASSWORD RESET SUCCESSFUL FOR:", user.email);
    console.log("=================================\n");

    res.json({
      message:
        "Password reset successful. You can now login with your new password.",
      code: "PASSWORD_RESET_SUCCESS",
    });
  } catch (error) {
    console.error("Reset password error:", error);
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

    const user = await User.findOne({
      email: email,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user || !user.resetPasswordToken) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
        code: "INVALID_TOKEN",
      });
    }

    const isValidToken = await bcrypt.compare(token, user.resetPasswordToken);

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
    console.error("Verify token error:", error);
    res.status(500).json({
      message: "Failed to verify token",
      code: "VERIFY_ERROR",
    });
  }
});
