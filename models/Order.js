const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  bagId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SurpriseBag",
    required: true,
  },

  customerPhone: {
    type: String,
    required: true,
  },

  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
  },

  razorpayPaymentId: {
    type: String,
    default: null,
  },

  pickupOTP: {
    type: String,
    default: null,
  },

  status: {
    type: String,
    enum: [
      "pending",
      "paid",
      "reserved",
      "completed",
      "failed",
    ],
    default: "pending",
  },

  // True while this order holds one unit of stock.
  stockReserved: {
    type: Boolean,
    default: true,
  },

  // Prevents stock from being restored more than once.
  stockReleased: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Order", OrderSchema);