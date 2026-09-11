const mongoose = require("mongoose");

const SurpriseBagSchema = new mongoose.Schema({
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
  },
  originalPrice: { type: Number, required: true },
  discountedPrice: { type: Number, required: true },
  category: { type: String, required: true }, // e.g., 'Bakery', 'Produce', 'Meals'
  dietType: { type: String, enum: ["Veg", "Non-Veg", "Mixed"], required: true },
  quantityAvailable: { type: Number, required: true, min: 0 },
  pickupStartTime: { type: String, required: true }, // e.g., "18:00"
  pickupEndTime: { type: String, required: true }, // e.g., "20:00"
  status: { type: String, default: "Active" },
});

module.exports = mongoose.model("SurpriseBag", SurpriseBagSchema);
