const express = require("express");
const crypto = require("crypto");
const router = express.Router();

// Simulated OTP storage (In production, use Redis or a database)
const otpStore = {};

router.post("/customer/send-otp", (req, res) => {
  const { phone } = req.body;
  const otp = crypto.randomInt(100000, 999999).toString();
  otpStore[phone] = otp;
  console.log(`OTP for ${phone} is ${otp}`); // Simulating SMS text
  res.status(200).json({ message: "OTP sent successfully" });
});

router.post("/admin/login", (req, res) => {
  const { email, password } = req.body;
  // Hardcoded check for demo purposes; normally verified against DB
  if (email === "admin@food2go.com" && password === "secureAdmin123") {
    res.status(200).json({ message: "Admin authenticated", role: "admin" });
  } else {
    res.status(401).json({ error: "Invalid admin credentials" });
  }
});

module.exports = router;
