const mongoose = require("mongoose");

const BusinessSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  storeName: { type: String, required: true },
  status: { type: String, default: "Active" }, // Instantly active!
});

module.exports = mongoose.model("Business", BusinessSchema);
