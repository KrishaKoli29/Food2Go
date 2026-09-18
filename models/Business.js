const mongoose = require("mongoose");

const BusinessSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
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
    default: "Active",
  },
});

module.exports = mongoose.model("Business", BusinessSchema);