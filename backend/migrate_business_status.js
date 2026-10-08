/**
 * migrate_business_status.js
 *
 * One-time migration: converts any Business documents that still have
 * status = "Active" (old default) to status = "approved".
 *
 * Run from the backend directory:
 *   node migrate_business_status.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Business = require("./models/Business");

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB:", process.env.MONGO_URI);

  const result = await Business.updateMany(
    { status: "Active" },
    { $set: { status: "approved" } }
  );

  console.log(`Migration complete. Updated ${result.modifiedCount} business(es) from "Active" → "approved".`);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});
