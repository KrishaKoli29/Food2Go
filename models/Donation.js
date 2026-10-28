const mongoose = require("mongoose");

const DonationSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    businessName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    dietType: { type: String, enum: ["Veg", "Non-Veg", "Mixed"], required: true },
    quantity: { type: Number, required: true, min: 1 },
    pickupStartTime: { type: String, required: true },
    pickupEndTime: { type: String, required: true },
    notes: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["Available", "Accepted", "Collected", "Completed", "Cancelled"], default: "Available", index: true },
    ngoUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    ngoName: { type: String, trim: true, default: "" },
    ngoContact: { type: String, trim: true, default: "" },
    acceptedAt: { type: Date, default: null },
    collectedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Donation", DonationSchema);
