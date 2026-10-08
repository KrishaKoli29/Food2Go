const mongoose = require("mongoose");

/**
 * CustomerProfile – lightweight profile linked to a User account.
 * Populated when the customer fills in optional details.
 */
const customerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
  name: { type: String, default: "" },
  phone: { type: String, default: "" },
  city: { type: String, default: "" }, // Gujarat city, e.g. "Ahmedabad"
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CustomerProfile", customerProfileSchema);
