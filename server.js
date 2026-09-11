const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors());

// Define routes BEFORE starting the server
app.use("/api/auth", require("./routes/auth"));
app.use("/api/business", require("./routes/business"));
app.use("/api/bags", require("./routes/bags"));

// The { family: 4 } forces Node to use IPv4 (127.0.0.1) instead of IPv6 (::1)
mongoose
  .connect("mongodb://127.0.0.1:27017/food2go", { family: 4 })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error: ", err.message));

app.listen(5000, () => console.log("Server running on port 5000"));
