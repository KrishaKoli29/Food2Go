const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    bagId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SurpriseBag",
      required: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "completed"],
      default: "confirmed",
    },
    // Snapshot of bag details at booking time (in case bag is deleted/updated later)
    snapshot: {
      storeName: String,
      category: String,
      dietType: String,
      discountedPrice: Number,
      originalPrice: Number,
      pickupStartTime: String,
      pickupEndTime: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", BookingSchema);
