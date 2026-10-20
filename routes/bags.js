const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const SurpriseBag = require("../models/SurpriseBag");
const Business = require("../models/Business");
const Order = require("../models/Order");

// Validate MongoDB ID
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Validate listing data
const validateListing = (data, isUpdate = false) => {
  const {
    originalPrice,
    discountedPrice,
    category,
    dietType,
    quantityAvailable,
    pickupStartTime,
    pickupEndTime,
  } = data;

  if (
    !isUpdate &&
    (
      originalPrice === undefined ||
      discountedPrice === undefined ||
      category === undefined ||
      dietType === undefined ||
      quantityAvailable === undefined ||
      pickupStartTime === undefined ||
      pickupEndTime === undefined
    )
  ) {
    return "All food listing fields are required.";
  }

  if (
    originalPrice !== undefined &&
    (!Number.isFinite(Number(originalPrice)) || Number(originalPrice) <= 0)
  ) {
    return "Original price must be greater than zero.";
  }

  if (
    discountedPrice !== undefined &&
    (!Number.isFinite(Number(discountedPrice)) ||
      Number(discountedPrice) <= 0)
  ) {
    return "Discounted price must be greater than zero.";
  }

  if (
    originalPrice !== undefined &&
    discountedPrice !== undefined
  ) {
    const original = Number(originalPrice);
    const discounted = Number(discountedPrice);

    if (discounted >= original) {
      return "Discounted price must be lower than original price.";
    }

    const discount = ((original - discounted) / original) * 100;

    if (discount < 30) {
      return "A minimum discount of 30% is required.";
    }
  }

  if (
    category !== undefined &&
    (typeof category !== "string" || !category.trim())
  ) {
    return "Food category is required.";
  }

  if (
    dietType !== undefined &&
    !["Veg", "Non-Veg", "Mixed"].includes(dietType)
  ) {
    return "Diet type must be Veg, Non-Veg, or Mixed.";
  }

  if (
    quantityAvailable !== undefined &&
    (!Number.isInteger(Number(quantityAvailable)) ||
      Number(quantityAvailable) < 0)
  ) {
    return "Quantity must be a non-negative whole number.";
  }

  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

  if (
    pickupStartTime !== undefined &&
    !timePattern.test(pickupStartTime)
  ) {
    return "Pickup start time must use HH:MM format.";
  }

  if (
    pickupEndTime !== undefined &&
    !timePattern.test(pickupEndTime)
  ) {
    return "Pickup end time must use HH:MM format.";
  }

  return null;
};

// Find a business
const findBusiness = async (businessId) => {
  if (!businessId || !isValidId(businessId)) {
    return null;
  }

  return Business.findById(businessId);
};

// Check for orders that should prevent editing/deleting
const hasActiveOrders = async (bagId) => {
  return Order.exists({
    bagId,
    status: { $in: ["pending", "paid", "reserved"] },
  });
};

// ============================================
// 1. CREATE FOOD LISTING
// POST /api/bags/create
// ============================================
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

    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({
        message: "A valid businessId is required.",
      });
    }

    const business = await findBusiness(businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found.",
      });
    }

    if (String(business.status).toLowerCase() !== "active") {
      return res.status(400).json({
        message: "Your business is not active.",
      });
    }

    const validationError = validateListing(req.body);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const bag = await SurpriseBag.create({
      businessId: business._id,
      originalPrice: Number(originalPrice),
      discountedPrice: Number(discountedPrice),
      category: category.trim(),
      dietType,
      quantityAvailable: Number(quantityAvailable),
      pickupStartTime,
      pickupEndTime,
      status: "Active",
    });

    return res.status(201).json({
      success: true,
      message: "Food listing created successfully.",
      bag,
    });
  } catch (error) {
    console.error("CREATE BAG ERROR:", error);

    return res.status(500).json({
      message: "Failed to create food listing.",
      error: error.message,
    });
  }
});

// ============================================
// 2. GET LISTINGS FOR A BUSINESS
// GET /api/bags/business/:businessId
// ============================================
router.get("/business/:businessId", async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!isValidId(businessId)) {
      return res.status(400).json({
        message: "Invalid business ID.",
      });
    }

    const business = await Business.findById(businessId);

    if (!business) {
      return res.status(404).json({
        message: "Business not found.",
      });
    }

    const bags = await SurpriseBag.find({
      businessId: business._id,
    }).sort({ _id: -1 });

    return res.status(200).json({
      success: true,
      bags,
    });
  } catch (error) {
    console.error("FETCH BUSINESS BAGS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch business listings.",
      error: error.message,
    });
  }
});

// ============================================
// 3. EDIT FOOD LISTING
// PUT /api/bags/:bagId
// ============================================
router.put("/:bagId", async (req, res) => {
  try {
    const { bagId } = req.params;
    const { businessId } = req.body;

    if (!isValidId(bagId)) {
      return res.status(400).json({
        message: "Invalid food listing ID.",
      });
    }

    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({
        message: "A valid businessId is required.",
      });
    }

    const bag = await SurpriseBag.findById(bagId);

    if (!bag) {
      return res.status(404).json({
        message: "Food listing not found.",
      });
    }

    if (String(bag.businessId) !== String(businessId)) {
      return res.status(403).json({
        message: "You cannot edit another business's listing.",
      });
    }

    if (String(bag.status).toLowerCase() !== "active") {
      return res.status(400).json({
        message: "Only active food listings can be edited.",
      });
    }

    const activeOrders = await hasActiveOrders(bagId);

    if (activeOrders) {
      return res.status(409).json({
        message:
          "This listing has a pending or active order. It cannot be edited until that order is resolved.",
      });
    }

    const allowedFields = [
      "originalPrice",
      "discountedPrice",
      "category",
      "dietType",
      "quantityAvailable",
      "pickupStartTime",
      "pickupEndTime",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        message: "No listing fields were provided to update.",
      });
    }

    const validationData = {
      originalPrice: updates.originalPrice ?? bag.originalPrice,
      discountedPrice: updates.discountedPrice ?? bag.discountedPrice,
      category: updates.category ?? bag.category,
      dietType: updates.dietType ?? bag.dietType,
      quantityAvailable:
        updates.quantityAvailable ?? bag.quantityAvailable,
      pickupStartTime: updates.pickupStartTime ?? bag.pickupStartTime,
      pickupEndTime: updates.pickupEndTime ?? bag.pickupEndTime,
    };

    const validationError = validateListing(validationData);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    if (updates.originalPrice !== undefined) {
      updates.originalPrice = Number(updates.originalPrice);
    }

    if (updates.discountedPrice !== undefined) {
      updates.discountedPrice = Number(updates.discountedPrice);
    }

    if (updates.quantityAvailable !== undefined) {
      updates.quantityAvailable = Number(updates.quantityAvailable);
    }

    if (updates.category !== undefined) {
      updates.category = updates.category.trim();
    }

    Object.assign(bag, updates);

    await bag.save();

    return res.status(200).json({
      success: true,
      message: "Food listing updated successfully.",
      bag,
    });
  } catch (error) {
    console.error("UPDATE BAG ERROR:", error);

    return res.status(500).json({
      message: "Failed to update food listing.",
      error: error.message,
    });
  }
});

// ============================================
// 4. DELETE FOOD LISTING
// DELETE /api/bags/:bagId
// ============================================
router.delete("/:bagId", async (req, res) => {
  try {
    const { bagId } = req.params;
    const { businessId } = req.body || {};

    if (!isValidId(bagId)) {
      return res.status(400).json({
        message: "Invalid food listing ID.",
      });
    }

    if (!businessId || !isValidId(businessId)) {
      return res.status(400).json({
        message: "A valid businessId is required.",
      });
    }

    const bag = await SurpriseBag.findById(bagId);

    if (!bag) {
      return res.status(404).json({
        message: "Food listing not found.",
      });
    }

    if (String(bag.businessId) !== String(businessId)) {
      return res.status(403).json({
        message: "You cannot delete another business's listing.",
      });
    }

    if (String(bag.status).toLowerCase() !== "active") {
      return res.status(400).json({
        message: "This listing is already inactive.",
      });
    }

    const activeOrders = await hasActiveOrders(bagId);

    if (activeOrders) {
      return res.status(409).json({
        message:
          "This listing has a pending or active order. Resolve the order before deleting the listing.",
      });
    }

    // Soft delete: keep the record for order history.
    bag.status = "Inactive";
    bag.quantityAvailable = 0;

    await bag.save();

    return res.status(200).json({
      success: true,
      message: "Food listing deleted successfully.",
      bag,
    });
  } catch (error) {
    console.error("DELETE BAG ERROR:", error);

    return res.status(500).json({
      message: "Failed to delete food listing.",
      error: error.message,
    });
  }
});

// ============================================
// 5. GET ACTIVE FOOD LISTINGS
// GET /api/bags/active
// ============================================
router.get("/active", async (req, res) => {
  try {
    const bags = await SurpriseBag.find({
      status: "Active",
      quantityAvailable: { $gt: 0 },
    })
      .populate("businessId", "storeName latitude longitude status")
      .sort({ _id: -1 });

    return res.status(200).json({
      success: true,
      bags,
    });
  } catch (error) {
    console.error("FETCH ACTIVE BAGS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch active food listings.",
      error: error.message,
    });
  }
});

// ============================================
// 6. TEST BAGS ROUTER
// GET /api/bags/test
// ============================================
router.get("/test", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Food2Go bags router is working.",
  });
});

module.exports = router;