const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const generateOtp = require("../utils/generateOtp");
const sendOtpEmail = require("../utils/sendOtp");

const router = express.Router();


// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Generate a plaintext OTP, hash it, compute its expiry timestamp,
 * and return all three so the caller can persist them and send the email.
 */
async function makeOtp() {
  const plainOtp = generateOtp();
  const hashedOtp = await bcrypt.hash(plainOtp, 10);
  const expiresMinutes = Number(process.env.OTP_EXPIRES_MINUTES) || 10;
  const otpExpiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);
  return { plainOtp, hashedOtp, otpExpiresAt };
}

// ─── POST /api/auth/request-otp ──────────────────────────────────────────────
// Step 1 of customer OR business sign-up: provide email + role.
// Creates (or refreshes) an unverified record and sends an OTP.
// Accepts optional `role` param; defaults to "customer".

router.post("/request-otp", async (req, res) => {
  try {
    const { email, role = "customer" } = req.body;

    if (!email) {
      return res.status(400).json({ message: "email is required." });
    }
    if (!["customer", "business"].includes(role)) {
      return res.status(400).json({ message: "role must be 'customer' or 'business'." });
    }

    // Check if a verified account already exists for this email
    const existing = await User.findOne({ email });
    if (existing && existing.isVerified) {
      return res.status(409).json({
        message: "An account with that email already exists. Please log in.",
      });
    }

    const { plainOtp, hashedOtp, otpExpiresAt } = await makeOtp();

    if (existing) {
      // Unverified record already exists — refresh the OTP
      existing.otp = hashedOtp;
      existing.otpExpiresAt = otpExpiresAt;
      await existing.save();
    } else {
      // New user — create a placeholder record (password will be set after OTP)
      // We use a random bcrypt hash as a placeholder so the schema stays valid.
      const placeholderHash = await bcrypt.hash(Math.random().toString(36), 10);
      await User.create({
        email,
        passwordHash: placeholderHash,
        role,
        isVerified: false,
        otp: hashedOtp,
        otpExpiresAt,
      });
    }

    try {
      await sendOtpEmail(email, plainOtp);
    } catch (mailErr) {
      console.error("Failed to send OTP email:", mailErr.message);
      return res.status(500).json({ message: "Could not send OTP email. Please try again." });
    }

    return res.status(200).json({
      message: "OTP sent to your email. It expires in 10 minutes.",
    });
  } catch (err) {
    console.error("request-otp error:", err);
    res.status(500).json({ message: "Server error while sending OTP." });
  }
});

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────
// Verifies OTP for both customer and business sign-up.
// After verification the user still needs to set their real password via /set-password.

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "email and otp are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found for that email." });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified. Please log in." });
    }
    if (!user.otp || !user.otpExpiresAt) {
      return res.status(400).json({ message: "No OTP found. Please request a new one." });
    }

    // Check expiry first (avoids unnecessary bcrypt work)
    if (new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect OTP. Please try again." });
    }

    // Mark verified and clear OTP fields — password will be set next
    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    return res.status(200).json({
      message: "Email verified successfully. Please set your password.",
      role: user.role,
    });
  } catch (err) {
    console.error("verify-otp error:", err);
    res.status(500).json({ message: "Server error during OTP verification." });
  }
});

// ─── POST /api/auth/set-password ─────────────────────────────────────────────
// Step 3 of sign-up (both customer and business): set the real password.
// The account must already be verified (isVerified = true).
// Returns a JWT so the client can log the user in immediately.

router.post("/set-password", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found for that email." });
    }
    if (!user.isVerified) {
      return res.status(403).json({ message: "Email not verified. Please verify your OTP first." });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();

    // Issue JWT so the user is logged in immediately after setting password
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Password set successfully.",
      token,
      role: user.role,
      userId: user._id,
    });
  } catch (err) {
    console.error("set-password error:", err);
    res.status(500).json({ message: "Server error while setting password." });
  }
});

// ─── POST /api/auth/resend-otp ───────────────────────────────────────────────
// Works for both customer and business unverified accounts.

router.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "email is required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found for that email." });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified. Please log in." });
    }

    const { plainOtp, hashedOtp, otpExpiresAt } = await makeOtp();
    user.otp = hashedOtp;
    user.otpExpiresAt = otpExpiresAt;
    await user.save();

    await sendOtpEmail(email, plainOtp);

    return res.status(200).json({ message: "A new OTP has been sent to your email." });
  } catch (err) {
    console.error("resend-otp error:", err);
    res.status(500).json({ message: "Server error while resending OTP." });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Block unverified accounts (any role)
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        requiresOtp: true,
        role: user.role,
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      token,
      role: user.role,
      userId: user._id,
    });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Validates a stored JWT and returns basic user info.
// The Expo app uses this on startup to restore session.

const { requireAuth } = require("../middleware/auth");

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("email role isVerified");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    res.status(200).json({ userId: user._id, email: user.email, role: user.role });
  } catch (err) {
    console.error("me error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
