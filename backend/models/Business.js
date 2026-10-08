const mongoose = require("mongoose");

const BusinessSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true, // one business profile per user account
  },

  storeName: {
    type: String,
    required: true,
  },

  latitude: {
    type: Number,
    required: true,
  },

  longitude: {
    type: Number,
    required: true,
  },

  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "suspended"],
    default: "pending",
  },

  rejectionReason: {
    type: String,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model("Business", BusinessSchema);
