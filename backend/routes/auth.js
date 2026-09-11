const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const generateOtp = require("../utils/generateOtp");
const sendOtpEmail = require("../utils/sendOtp");

const router = express.Router();


// ─── Helper ─────────────────────────────────────────────────────────────────

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
// Step 1 of customer sign-up: provide only an email address.
// Creates (or refreshes) an unverified customer record and sends an OTP.
// No password is required at this stage.

router.post("/request-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "email is required." });
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
      const placeholderHash = await bcrypt.hash(
        Math.random().toString(36),
        10
      );
      await User.create({
        email,
        passwordHash: placeholderHash,
        role: "customer",
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

// ─── POST /api/auth/register ─────────────────────────────────────────────────
// Legacy endpoint — kept for business sign-up (no OTP required).

router.post("/register", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "email, password and role are required." });
    }
    if (!["customer", "business"].includes(role)) {
      return res.status(400).json({ message: "role must be 'customer' or 'business'." });
    }

    // Check for existing account
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Business — no OTP, mark verified immediately
    if (role === "business") {
      await User.create({ email, passwordHash, role, isVerified: true });
      return res.status(201).json({
        message: "Business account created. You can now log in.",
        requiresOtp: false,
      });
    }

    // Customer sign-up via legacy path (email+password at once)
    const { plainOtp, hashedOtp, otpExpiresAt } = await makeOtp();
    await User.create({
      email,
      passwordHash,
      role,
      otp: hashedOtp,
      otpExpiresAt,
      isVerified: false,
    });

    try {
      await sendOtpEmail(email, plainOtp);
    } catch (mailErr) {
      console.error("Failed to send OTP email:", mailErr.message);
    }

    return res.status(201).json({
      message: "Account created. Check your email for the OTP.",
      requiresOtp: true,
    });
  } catch (err) {
    console.error("register error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────

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

    // Mark verified and clear OTP fields
    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    // Issue JWT so the customer is logged in immediately
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Email verified successfully.",
      token,
      role: user.role,
    });
  } catch (err) {
    console.error("verify-otp error:", err);
    res.status(500).json({ message: "Server error during OTP verification." });
  }
});

// ─── POST /api/auth/set-password ─────────────────────────────────────────────
// Step 3 of customer sign-up: set the real password after OTP is verified.
// The account must already be verified (isVerified = true).

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

    return res.status(200).json({ message: "Password set successfully. You can now log in." });
  } catch (err) {
    console.error("set-password error:", err);
    res.status(500).json({ message: "Server error while setting password." });
  }
});

// ─── POST /api/auth/resend-otp ───────────────────────────────────────────────

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
    if (user.role !== "customer") {
      return res.status(400).json({ message: "OTP is only required for customer accounts." });
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

    // Block unverified customers
    if (user.role === "customer" && !user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        requiresOtp: true,
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({ token, role: user.role });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
});

module.exports = router;
