require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Request logger
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.originalUrl}`);
  next();
});

// Load bags router separately to verify it
const bagsRouter = require("./routes/bags");

console.log("Bags router loaded from:", require.resolve("./routes/bags"));

// API Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/business", require("./routes/business"));
app.use("/api/bags", bagsRouter);
app.use("/api/orders", require("./routes/orders"));
app.use("/api/donations", require("./routes/donations"));

// Temporary diagnostic endpoint
app.get("/debug", (req, res) => {
  res.json({
    success: true,
    message: "Food2Go server is responding.",
    bagsRouterLoaded: true
  });
});

// Handle unmatched routes
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    message: "Route not found.",
    method: req.method,
    path: req.originalUrl
  });
});

// MongoDB Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/food2go", { family: 4 })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err.message));

// Start Server 
app.listen(5000, () => {
  console.log("Server running on port 5000");
});