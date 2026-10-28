const express = require("express");
const mongoose = require("mongoose");
const Donation = require("../models/Donation");
const Business = require("../models/Business");
const User = require("../models/User");

const router = express.Router();
const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

// Publish a free food donation from a registered business.
router.post("/create", async (req, res) => {
  try {
    const { businessId, category, dietType, quantity, pickupStartTime, pickupEndTime, notes } = req.body;
    if (!businessId || !validId(businessId)) return res.status(400).json({ message: "A valid businessId is required." });
    if (!category || !String(category).trim()) return res.status(400).json({ message: "Food category is required." });
    if (!["Veg", "Non-Veg", "Mixed"].includes(dietType)) return res.status(400).json({ message: "Select a valid diet type." });
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1) return res.status(400).json({ message: "Quantity must be a whole number greater than zero." });
    if (!timePattern.test(pickupStartTime || "") || !timePattern.test(pickupEndTime || "")) return res.status(400).json({ message: "Pickup times must use HH:MM format." });

    const business = await Business.findById(businessId);
    if (!business || String(business.status).toLowerCase() !== "active") return res.status(404).json({ message: "Active business not found." });

    const donation = await Donation.create({
      businessId: business._id,
      businessName: business.storeName,
      category: String(category).trim(),
      dietType,
      quantity: Number(quantity),
      pickupStartTime,
      pickupEndTime,
      notes: String(notes || "").trim(),
    });
    return res.status(201).json({ success: true, message: "Food donation published.", donation });
  } catch (error) {
    console.error("CREATE DONATION ERROR:", error);
    return res.status(500).json({ message: "Failed to publish donation." });
  }
});

// Donations currently available for NGOs.
router.get("/available", async (_req, res) => {
  try {
    const donations = await Donation.find({ status: "Available" }).sort({ createdAt: -1 });
    return res.json({ success: true, donations });
  } catch (error) {
    console.error("FETCH AVAILABLE DONATIONS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch available donations." });
  }
});

// Business donation history.
router.get("/business/:businessId", async (req, res) => {
  try {
    if (!validId(req.params.businessId)) return res.status(400).json({ message: "Invalid business ID." });
    const donations = await Donation.find({ businessId: req.params.businessId }).sort({ createdAt: -1 });
    return res.json({ success: true, donations });
  } catch (error) {
    console.error("FETCH BUSINESS DONATIONS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch donation history." });
  }
});

// Donations already accepted by one NGO.
router.get("/ngo/:ngoUserId", async (req, res) => {
  try {
    if (!validId(req.params.ngoUserId)) return res.status(400).json({ message: "Invalid NGO account ID." });
    const ngo = await User.findById(req.params.ngoUserId);
    if (!ngo || ngo.role !== "ngo") return res.status(403).json({ message: "An NGO account is required." });
    const donations = await Donation.find({ ngoUserId: ngo._id }).sort({ updatedAt: -1 });
    return res.json({ success: true, donations });
  } catch (error) {
    console.error("FETCH NGO DONATIONS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch your donations." });
  }
});

// Claim is atomic: only one NGO can accept a donation.
router.post("/:donationId/accept", async (req, res) => {
  try {
    const { donationId } = req.params;
    const { ngoUserId, ngoName, ngoContact } = req.body;
    if (!validId(donationId) || !ngoUserId || !validId(ngoUserId)) return res.status(400).json({ message: "Valid donation and NGO account IDs are required." });
    if (!String(ngoName || "").trim() || !String(ngoContact || "").trim()) return res.status(400).json({ message: "NGO name and contact number are required." });
    const ngo = await User.findById(ngoUserId);
    if (!ngo || ngo.role !== "ngo") return res.status(403).json({ message: "Only an NGO account can accept donations." });

    const donation = await Donation.findOneAndUpdate(
      { _id: donationId, status: "Available" },
      { $set: { status: "Accepted", ngoUserId: ngo._id, ngoName: String(ngoName).trim(), ngoContact: String(ngoContact).trim(), acceptedAt: new Date() } },
      { new: true }
    );
    if (!donation) return res.status(409).json({ message: "This donation is no longer available. Refresh the list." });
    return res.json({ success: true, message: "Donation accepted. Contact the business to arrange pickup.", donation });
  } catch (error) {
    console.error("ACCEPT DONATION ERROR:", error);
    return res.status(500).json({ message: "Failed to accept donation." });
  }
});

// NGO updates the pickup and completion status for donations it accepted.
router.patch("/:donationId/status", async (req, res) => {
  try {
    const { donationId } = req.params;
    const { ngoUserId, status } = req.body;
    if (!validId(donationId) || !ngoUserId || !validId(ngoUserId)) return res.status(400).json({ message: "Valid donation and NGO account IDs are required." });
    if (!["Collected", "Completed"].includes(status)) return res.status(400).json({ message: "Invalid donation status." });
    const ngo = await User.findById(ngoUserId);
    if (!ngo || ngo.role !== "ngo") return res.status(403).json({ message: "Only an NGO account can update donation status." });

    const filter = { _id: donationId, ngoUserId: ngo._id };
    const update = status === "Collected"
      ? { $set: { status, collectedAt: new Date() } }
      : { $set: { status, completedAt: new Date() } };
    const allowedStatuses = status === "Collected" ? ["Accepted"] : ["Collected"];
    const donation = await Donation.findOneAndUpdate({ ...filter, status: { $in: allowedStatuses } }, update, { new: true });
    if (!donation) return res.status(409).json({ message: "Donation not found, not assigned to this NGO, or in the wrong status." });
    return res.json({ success: true, message: `Donation marked ${status.toLowerCase()}.`, donation });
  } catch (error) {
    console.error("UPDATE DONATION STATUS ERROR:", error);
    return res.status(500).json({ message: "Failed to update donation status." });
  }
});

// Business can cancel a donation only while it is still available.
router.patch("/:donationId/cancel", async (req, res) => {
  try {
    const { donationId } = req.params;
    const { businessId } = req.body;
    if (!validId(donationId) || !businessId || !validId(businessId)) return res.status(400).json({ message: "Valid donation and business IDs are required." });
    const donation = await Donation.findOneAndUpdate(
      { _id: donationId, businessId, status: "Available" },
      { $set: { status: "Cancelled" } },
      { new: true }
    );
    if (!donation) return res.status(409).json({ message: "Only available donations can be cancelled." });
    return res.json({ success: true, message: "Donation cancelled.", donation });
  } catch (error) {
    console.error("CANCEL DONATION ERROR:", error);
    return res.status(500).json({ message: "Failed to cancel donation." });
  }
});

module.exports = router;
