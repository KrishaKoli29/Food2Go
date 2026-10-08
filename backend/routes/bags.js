const express = require("express");
const router = express.Router();
const SurpriseBag = require("../models/SurpriseBag");
const Business = require("../models/Business");
const { requireAuth, requireRole } = require("../middleware/auth");

// ─── POST /api/bags/create ────────────────────────────────────────────────────
// Create a new Surprise Bag. Enforces minimum 30% discount.
// Protected: only "business" role; businessId is resolved from the JWT — not
// taken from the request body, so a business can only create bags for itself.

router.post("/create", requireAuth, requireRole("business"), async (req, res) => {
  try {
    // Look up the business profile that belongs to this authenticated user
    const business = await Business.findOne({ userId: req.user.userId });
    if (!business) {
      return res.status(404).json({
        error: "Business profile not found. Please complete onboarding first.",
      });
    }

    // Only approved businesses can publish bags
    if (business.status !== "approved") {
      const statusMessages = {
        pending: "Your business is pending admin approval. You cannot publish bags until approved.",
        rejected: "Your business registration was rejected. You cannot publish bags.",
        suspended: "Your business is suspended. You cannot publish bags.",
      };
      return res.status(403).json({
        error: statusMessages[business.status] || "Business is not approved to publish bags.",
      });
    }

    const {
      originalPrice,
      discountedPrice,
      category,
      dietType,
      quantityAvailable,
      pickupStartTime,
      pickupEndTime,
    } = req.body;

    // Minimum 30% discount validation
    const minDiscountPrice = originalPrice * 0.7;
    if (discountedPrice > minDiscountPrice) {
      return res.status(400).json({
        error: `Discount not deep enough. Price must be at least 30% off (Max: ₹${minDiscountPrice})`,
      });
    }

    const newBag = new SurpriseBag({
      businessId: business._id,
      originalPrice,
      discountedPrice,
      category,
      dietType,
      quantityAvailable,
      pickupStartTime,
      pickupEndTime,
    });

    await newBag.save();
    console.log(`New Surprise Bag created for business: ${business.storeName}`);

    res.status(201).json({
      message: "Surprise Bag created successfully",
      bag: newBag,
    });
  } catch (error) {
    console.log("Error creating bag:", error.message);
    res.status(500).json({ error: "Failed to create Surprise Bag" });
  }
});

// ─── GET /api/bags/mine ───────────────────────────────────────────────────────
// Return all bags belonging to the authenticated business's store.
// Protected: "business" role only.

router.get("/mine", requireAuth, requireRole("business"), async (req, res) => {
  try {
    const business = await Business.findOne({ userId: req.user.userId });
    if (!business) {
      return res.status(200).json([]);
    }

    const bags = await SurpriseBag.find({ businessId: business._id });
    res.status(200).json(bags);
  } catch (error) {
    console.log("Error fetching business bags:", error.message);
    res.status(500).json({ error: "Failed to fetch bags" });
  }
});

// ─── GET /api/bags/active ─────────────────────────────────────────────────────
// Return active bags (quantity > 0) with business store info populated.
// Public — customers use this; also accessible with a valid JWT (any role).

router.get("/active", requireAuth, async (req, res) => {
  try {
    const availableBags = await SurpriseBag.find({
      status: "Active",
      quantityAvailable: { $gt: 0 },
    }).populate("businessId", "storeName latitude longitude");

    console.log(
      `Customer requested bags. Found: ${availableBags.length} available.`
    );
    res.status(200).json(availableBags);
  } catch (error) {
    console.log("Error fetching bags:", error.message);
    res.status(500).json({ error: "Failed to fetch available bags" });
  }
});

// ─── PATCH /api/bags/:id/deactivate ────────────────────────────────────────────
// Mark a bag as Inactive so it no longer appears to customers.
// Protected: "business" role only; must own the bag.

router.patch("/:id/deactivate", requireAuth, requireRole("business"), async (req, res) => {
  try {
    const business = await Business.findOne({ userId: req.user.userId });
    if (!business) {
      return res.status(404).json({ error: "Business profile not found." });
    }

    const bag = await SurpriseBag.findOne({
      _id: req.params.id,
      businessId: business._id,
    });

    if (!bag) {
      return res.status(404).json({ error: "Bag not found or you do not own it." });
    }

    bag.status = "Inactive";
    await bag.save();

    console.log(`Bag ${bag._id} deactivated by business ${business._id}`);
    res.status(200).json({ message: "Bag deactivated.", bag });
  } catch (error) {
    console.log("Error deactivating bag:", error.message);
    res.status(500).json({ error: "Failed to deactivate bag." });
  }
});

module.exports = router;
