const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const SurpriseBag = require("../models/SurpriseBag");
const Business = require("../models/Business");
const { requireAuth, requireRole } = require("../middleware/auth");

// ─── POST /api/bookings/reserve ───────────────────────────────────────────────
// Customer reserves a surprise bag.
// - Checks bag still exists and has quantity > 0.
// - Decrements quantityAvailable by 1.
// - Creates a Booking record.

router.post("/reserve", requireAuth, requireRole("customer"), async (req, res) => {
  try {
    const { bagId } = req.body;
    if (!bagId) {
      return res.status(400).json({ error: "bagId is required." });
    }

    // Fetch bag and lock-check quantity
    const bag = await SurpriseBag.findById(bagId).populate(
      "businessId",
      "storeName"
    );

    if (!bag) {
      return res.status(404).json({ error: "Bag not found." });
    }

    if (bag.status !== "Active") {
      return res.status(400).json({ error: "This bag is no longer available." });
    }

    if (bag.quantityAvailable <= 0) {
      return res.status(400).json({ error: "Sorry, this bag is sold out." });
    }

    // Decrement quantity
    bag.quantityAvailable -= 1;
    if (bag.quantityAvailable === 0) {
      bag.status = "Sold Out";
    }
    await bag.save();

    // Create booking record with snapshot
    const booking = new Booking({
      bagId: bag._id,
      customerId: req.user.userId,
      businessId: bag.businessId._id,
      snapshot: {
        storeName: bag.businessId?.storeName || "Unknown Store",
        category: bag.category,
        dietType: bag.dietType,
        discountedPrice: bag.discountedPrice,
        originalPrice: bag.originalPrice,
        pickupStartTime: bag.pickupStartTime,
        pickupEndTime: bag.pickupEndTime,
      },
    });

    await booking.save();

    console.log(
      `Booking created: customer ${req.user.userId} reserved bag ${bag._id}`
    );

    res.status(201).json({
      message: "Bag reserved successfully!",
      booking,
    });
  } catch (error) {
    console.log("Booking error:", error.message);
    res.status(500).json({ error: "Failed to create booking." });
  }
});

// ─── GET /api/bookings/mine ───────────────────────────────────────────────────
// Returns all bookings made by the authenticated customer.

router.get("/mine", requireAuth, requireRole("customer"), async (req, res) => {
  try {
    const bookings = await Booking.find({
      customerId: req.user.userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json(bookings);
  } catch (error) {
    console.log("Error fetching customer bookings:", error.message);
    res.status(500).json({ error: "Failed to fetch bookings." });
  }
});

// ─── GET /api/bookings/business ──────────────────────────────────────────────
// Returns all bookings for the authenticated business's bags.

router.get(
  "/business",
  requireAuth,
  requireRole("business"),
  async (req, res) => {
    try {
      const business = await Business.findOne({ userId: req.user.userId });
      if (!business) {
        return res.status(200).json([]);
      }

      const bookings = await Booking.find({ businessId: business._id })
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json(bookings);
    } catch (error) {
      console.log("Error fetching business bookings:", error.message);
      res.status(500).json({ error: "Failed to fetch business bookings." });
    }
  }
);

module.exports = router;
