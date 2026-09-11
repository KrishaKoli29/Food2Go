const express = require("express");
const router = express.Router();
const SurpriseBag = require("../models/SurpriseBag");

// POST route to create a new Surprise Bag
router.post("/create", async (req, res) => {
  try {
    const {
      businessId,
      originalPrice,
      discountedPrice,
      category,
      dietType,
      quantityAvailable,
      pickupStartTime,
      pickupEndTime,
    } = req.body;

    // Step 3.2: Minimum Discount Validation (Must be at least 30% off)
    const minDiscountPrice = originalPrice * 0.7;
    if (discountedPrice > minDiscountPrice) {
      return res.status(400).json({
        error: `Discount not deep enough. Price must be at least 30% off (Max: ₹${minDiscountPrice})`,
      });
    }

    const newBag = new SurpriseBag({
      businessId,
      originalPrice,
      discountedPrice,
      category,
      dietType,
      quantityAvailable,
      pickupStartTime,
      pickupEndTime,
    });

    await newBag.save();
    console.log(`New Surprise Bag created for business ID: ${businessId}`);

    res.status(201).json({
      message: "Surprise Bag created successfully",
      bag: newBag,
    });
  } catch (error) {
    console.log("Error creating bag: ", error.message);
    res.status(500).json({ error: "Failed to create Surprise Bag" });
  }
});

// GET route for Customers to view available Surprise Bags
router.get("/active", async (req, res) => {
  try {
    // Only fetch bags that are Active AND have at least 1 bag left
    const availableBags = await SurpriseBag.find({
      status: "Active",
      quantityAvailable: { $gt: 0 }, // $gt means "greater than"
    }).populate("businessId", "storeName"); // This pulls in the store's name!

    console.log(
      `Customer requested bags. Found: ${availableBags.length} available.`,
    );
    res.status(200).json(availableBags);
  } catch (error) {
    console.log("Error fetching bags: ", error.message);
    res.status(500).json({ error: "Failed to fetch available bags" });
  }
});

module.exports = router;
