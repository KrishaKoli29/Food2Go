const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// ==========================
// EMAIL TRANSPORTER
// ==========================

require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ==========================
// OTP STORE
// ==========================

// Temporary signup data + OTP
const signupOtpStore = {};


// ==========================
// HASH PASSWORD
// ==========================

function hashPassword(password) {
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
}


// ==========================
// SEND SIGNUP EMAIL OTP
// ==========================

router.post("/send-signup-otp", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        error: "Email, password and role are required.",
      });
    }

    if (!["customer", "business"].includes(role)) {
      return res.status(400).json({
        error: "Invalid role.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log("OTP recipient email:", normalizedEmail);

    // Check if email already exists
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        error: "User already exists.",
      });
    }

    // Generate 6 digit OTP
    const otp = crypto
      .randomInt(100000, 999999)
      .toString();

    // OTP expires in 5 minutes
    const expiresAt = Date.now() + 5 * 60 * 1000;

    // Store signup information temporarily
    signupOtpStore[normalizedEmail] = {
      otp,
      password: hashPassword(password),
      role,
      expiresAt,
    };

    // Send email
    await transporter.sendMail({
      from: "YOUR_GMAIL@gmail.com",
      to: normalizedEmail,
      subject: "Food2Go Email Verification OTP",
      text: `Your Food2Go verification OTP is ${otp}.

This OTP will expire in 5 minutes.

If you did not request this OTP, please ignore this email.`,
    });

    console.log(`Signup OTP sent to ${normalizedEmail}`);

    res.status(200).json({
      message: "OTP sent successfully.",
    });

  } catch (error) {
    console.log("Send signup OTP error:", error);

    res.status(500).json({
      error: "Failed to send OTP.",
    });
  }
});


// ==========================
// VERIFY SIGNUP EMAIL OTP
// ==========================

router.post("/verify-signup-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        error: "Email and OTP are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const signupData = signupOtpStore[normalizedEmail];

    if (!signupData) {
      return res.status(400).json({
        error: "OTP not found. Please request a new OTP.",
      });
    }

    // Check expiry
    if (Date.now() > signupData.expiresAt) {
      delete signupOtpStore[normalizedEmail];

      return res.status(400).json({
        error: "OTP has expired. Please request a new OTP.",
      });
    }

    // Check OTP
    if (signupData.otp !== otp.toString()) {
      return res.status(400).json({
        error: "Invalid OTP.",
      });
    }

    // Double-check email isn't already registered
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      delete signupOtpStore[normalizedEmail];

      return res.status(409).json({
        error: "User already exists.",
      });
    }

    // Create user after successful OTP verification
    const user = await User.create({
      email: normalizedEmail,
      password: signupData.password,
      role: signupData.role,
      isEmailVerified: true,
    });

    // Remove OTP data
    delete signupOtpStore[normalizedEmail];

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      message: "Email verified and account created successfully.",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.log("Verify signup OTP error:", error);

    res.status(500).json({
      error: "Server error during OTP verification.",
    });
  }
});


// ==========================
// NORMAL SIGNUP
// ==========================
// Kept here for compatibility.
// The React Native signup screen will use
// /send-signup-otp and /verify-signup-otp instead.

router.post("/signup", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        error: "Email, password and role are required.",
      });
    }

    if (!["customer", "business"].includes(role)) {
      return res.status(400).json({
        error: "Invalid role.",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({
        error: "User already exists.",
      });
    }

    const hashedPassword = hashPassword(password);

    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      isEmailVerified: false,
    });

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.log("Signup error:", error);

    res.status(500).json({
      error: "Server error during signup.",
    });
  }
});


// ==========================
// LOGIN
// ==========================

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required.",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const hashedPassword = hashPassword(password);

    if (hashedPassword !== user.password) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.log("Login error:", error);

    res.status(500).json({
      error: "Server error during login.",
    });
  }
});


// ==========================
// CUSTOMER OTP
// ==========================

const otpStore = {};

router.post("/customer/send-otp", (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({
      error: "Phone number is required.",
    });
  }

  const otp = crypto
    .randomInt(100000, 999999)
    .toString();

  otpStore[phone] = otp;

  console.log(`OTP for ${phone} is ${otp}`);

  res.status(200).json({
    message: "OTP sent successfully.",
  });
});


// ==========================
// ADMIN LOGIN
// ==========================

router.post("/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === "admin@food2go.com" &&
    password === "secureAdmin123"
  ) {
    return res.status(200).json({
      message: "Admin authenticated",
      role: "admin",
    });
  }

  res.status(401).json({
    error: "Invalid admin credentials",
  });
});


module.exports = router;