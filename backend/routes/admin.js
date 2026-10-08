const express = require("express");
const router = express.Router();

const Business = require("../models/Business");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../middleware/auth");

// All admin routes require JWT + admin role
router.use(requireAuth, requireRole("admin"));

// ─── GET /api/admin/businesses ────────────────────────────────────────────────
// List all registered businesses with owner email and status.

router.get("/businesses", async (req, res) => {
  try {
    const businesses = await Business.find()
      .populate("userId", "email createdAt")
      .sort({ createdAt: -1 });

    const result = businesses.map((b) => ({
      _id: b._id,
      storeName: b.storeName,
      email: b.userId?.email ?? "—",
      latitude: b.latitude,
      longitude: b.longitude,
      status: b.status,
      rejectionReason: b.rejectionReason,
      createdAt: b.createdAt,
    }));

    res.status(200).json(result);
  } catch (err) {
    console.error("admin/businesses error:", err.message);
    res.status(500).json({ error: "Failed to fetch businesses." });
  }
});

// ─── PATCH /api/admin/businesses/:id/approve ─────────────────────────────────

router.patch("/businesses/:id/approve", async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { status: "approved", rejectionReason: null },
      { new: true }
    );
    if (!business) return res.status(404).json({ error: "Business not found." });

    console.log(`Admin approved business: ${business.storeName}`);
    res.status(200).json({ message: "Business approved.", business });
  } catch (err) {
    console.error("admin/approve error:", err.message);
    res.status(500).json({ error: "Failed to approve business." });
  }
});

// ─── PATCH /api/admin/businesses/:id/reject ──────────────────────────────────

router.patch("/businesses/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "A rejection reason is required." });
    }

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", rejectionReason: reason.trim() },
      { new: true }
    );
    if (!business) return res.status(404).json({ error: "Business not found." });

    console.log(`Admin rejected business: ${business.storeName} — reason: ${reason}`);
    res.status(200).json({ message: "Business rejected.", business });
  } catch (err) {
    console.error("admin/reject error:", err.message);
    res.status(500).json({ error: "Failed to reject business." });
  }
});

// ─── PATCH /api/admin/businesses/:id/suspend ─────────────────────────────────

router.patch("/businesses/:id/suspend", async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { status: "suspended" },
      { new: true }
    );
    if (!business) return res.status(404).json({ error: "Business not found." });

    console.log(`Admin suspended business: ${business.storeName}`);
    res.status(200).json({ message: "Business suspended.", business });
  } catch (err) {
    console.error("admin/suspend error:", err.message);
    res.status(500).json({ error: "Failed to suspend business." });
  }
});

module.exports = router;
