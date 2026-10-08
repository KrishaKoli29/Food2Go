const express = require("express");
const router = express.Router();

const CustomerProfile = require("../models/CustomerProfile");
const Business = require("../models/Business");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");

// ─── GET /api/profile/customer ───────────────────────────────────────────────
// Fetch the logged-in customer's profile (creates empty one if first time).

router.get("/customer", requireAuth, requireRole("customer"), async (req, res) => {
  try {
    let profile = await CustomerProfile.findOne({ userId: req.user.userId });
    if (!profile) {
      profile = await CustomerProfile.create({ userId: req.user.userId });
    }
    const user = await User.findById(req.user.userId).select("email");
    res.status(200).json({ email: user.email, ...profile.toObject() });
  } catch (err) {
    console.error("profile/customer error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── PUT /api/profile/customer ───────────────────────────────────────────────
// Update the logged-in customer's profile.

router.put("/customer", requireAuth, requireRole("customer"), async (req, res) => {
  try {
    const { name, phone, city } = req.body;
    const profile = await CustomerProfile.findOneAndUpdate(
      { userId: req.user.userId },
      { name, phone, city, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ message: "Profile updated.", profile });
  } catch (err) {
    console.error("profile/customer PUT error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// ─── GET /api/profile/business ───────────────────────────────────────────────
// Fetch the logged-in business user's profile (User + Business record).

router.get("/business", requireAuth, requireRole("business"), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("email");
    const business = await Business.findOne({ userId: req.user.userId });
    res.status(200).json({ email: user.email, business: business || null });
  } catch (err) {
    console.error("profile/business error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
