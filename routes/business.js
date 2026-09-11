const express = require("express");
const router = express.Router();
const Business = require("../models/Business");

// POST route for Business Onboarding (Instant Activation)
router.post("/onboard", async (req, res) => {
  try {
    const { storeName } = req.body; // FSSAI requirement removed

    const newBusiness = new Business({
      storeName: storeName,
      // status will automatically default to 'Active' based on our model
    });

    await newBusiness.save();
    console.log(`New business instantly activated: ${storeName}`);

    res.status(201).json({
      message: "Business profile created and activated successfully.",
      business: newBusiness,
    });
  } catch (error) {
    console.log("Error saving business: ", error.message);
    res.status(500).json({ error: "Failed to submit business details" });
  }
});

module.exports = router;
