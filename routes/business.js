const express = require("express");
const router = express.Router();

const Business = require("../models/Business");

// Create business/store
router.post("/onboard", async (req, res) => {
  try {
    const {
      storeName,
      latitude,
      longitude,
    } = req.body;

    if (
      !storeName ||
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        error: "Store name, latitude and longitude are required.",
      });
    }

    const newBusiness = new Business({
      storeName,
      latitude: Number(latitude),
      longitude: Number(longitude),
      status: "Active",
    });

    await newBusiness.save();

    console.log(
      `Business created: ${storeName} (${latitude}, ${longitude})`
    );

    res.status(201).json({
      message: "Business created successfully.",
      business: newBusiness,
    });
  } catch (error) {
    console.log("Error saving business:", error.message);

    res.status(500).json({
      error: "Failed to create business.",
    });
  }
});

// Get all active businesses
router.get("/active", async (req, res) => {
  try {
    const businesses = await Business.find({
      status: "Active",
    });

    res.status(200).json(businesses);
  } catch (error) {
    console.log("Error fetching businesses:", error.message);

    res.status(500).json({
      error: "Failed to fetch businesses.",
    });
  }
});

// Get a single business by ID (used to restore saved coordinates on login)
router.get("/:id", async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({ error: "Business not found." });
    }

    res.status(200).json({ business });
  } catch (error) {
    console.log("Error fetching business:", error.message);
    res.status(500).json({ error: "Failed to fetch business." });
  }
});

// Update store location coordinates
router.patch("/:id/location", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "latitude and longitude are required." });
    }

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { latitude: Number(latitude), longitude: Number(longitude) },
      { new: true }
    );

    if (!business) {
      return res.status(404).json({ error: "Business not found." });
    }

    console.log(`Location updated for business ${req.params.id}: (${latitude}, ${longitude})`);

    res.status(200).json({ message: "Location updated successfully.", business });
  } catch (error) {
    console.log("Error updating location:", error.message);
    res.status(500).json({ error: "Failed to update location." });
  }
});

module.exports = router;