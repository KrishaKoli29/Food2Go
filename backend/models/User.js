const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["customer", "business"],
    required: true,
  },
  // OTP verification — customers only
  isVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
    default: null, // stores bcrypt hash of the 6-digit OTP
  },
  otpExpiresAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
