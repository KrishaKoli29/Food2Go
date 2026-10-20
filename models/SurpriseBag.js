const mongoose = require("mongoose");

const SurpriseBagSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
  },

  originalPrice: {
    type: Number,
    required: true,
  },

  discountedPrice: {
    type: Number,
    required: true,
  },

  category: {
    type: String,
    required: true,
  },

  dietType: {
    type: String,
    enum: ["Veg", "Non-Veg", "Mixed"],
    required: true,
  },

  quantityAvailable: {
    type: Number,
    required: true,
    min: 0,
  },

  pickupStartTime: {
    type: String,
    required: true,
  },

  pickupEndTime: {
    type: String,
    required: true,
  },

  status: {
    type: String,
    default: "Active",
    enum: ["Active", "Inactive", "Sold Out"],
  },
});

module.exports = mongoose.model("SurpriseBag", SurpriseBagSchema);