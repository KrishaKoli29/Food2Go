const express = require("express");
const router = express.Router();

const Business = require("../models/Business");
const { requireAuth, requireRole } = require("../middleware/auth");

// ─── POST /api/business/onboard ──────────────────────────────────────────────
// Create or update the authenticated business user's store profile.
// New profiles start as "pending"; if the business already has an approved
// status, the status is preserved (re-saving doesn't downgrade to pending).
// Protected: only "business" role may call this.

router.post("/onboard", requireAuth, requireRole("business"), async (req, res) => {
  try {
    const { storeName, latitude, longitude } = req.body;

    if (!storeName || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: "Store name, latitude and longitude are required.",
      });
    }

    // Check if profile already exists so we can preserve its status
    const existing = await Business.findOne({ userId: req.user.userId });

    let business;
    if (existing) {
      // Update name and location — keep the current approval status
      existing.storeName = storeName;
      existing.latitude = Number(latitude);
      existing.longitude = Number(longitude);
      business = await existing.save();
    } else {
      // New profile — starts as pending
      business = await Business.create({
        userId: req.user.userId,
        storeName,
        latitude: Number(latitude),
        longitude: Number(longitude),
        status: "pending",
      });
    }

    console.log(`Business onboarded: ${storeName} (userId=${req.user.userId}), status=${business.status}`);

    res.status(201).json({
      message: "Business profile saved.",
      business,
    });
  } catch (error) {
    console.log("Error saving business:", error.message);
    res.status(500).json({ error: "Failed to save business." });
  }
});

// ─── GET /api/business/me ─────────────────────────────────────────────────────
// Return the authenticated business user's own profile (including status).
// Protected: only "business" role.

router.get("/me", requireAuth, requireRole("business"), async (req, res) => {
  try {
    const business = await Business.findOne({ userId: req.user.userId });
    if (!business) {
      // No profile yet — not an error; frontend shows onboarding form
      return res.status(200).json({ business: null });
    }
    res.status(200).json({ business });
  } catch (error) {
    console.log("Error fetching business profile:", error.message);
    res.status(500).json({ error: "Failed to fetch business profile." });
  }
});

// ─── GET /api/business/active ────────────────────────────────────────────────
// Return all APPROVED businesses (public — customers use this for the map).
// Only approved businesses are visible to customers.

router.get("/active", async (req, res) => {
  try {
    const businesses = await Business.find({ status: "approved" });
    res.status(200).json(businesses);
  } catch (error) {
    console.log("Error fetching businesses:", error.message);
    res.status(500).json({ error: "Failed to fetch businesses." });
  }
});

module.exports = router;
