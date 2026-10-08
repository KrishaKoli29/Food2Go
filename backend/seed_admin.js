/**
 * seed_admin.js
 *
 * Creates an admin user account for the Food2Go admin dashboard.
 * Run once from the backend directory:
 *
 *   node seed_admin.js
 *
 * Edit the ADMIN_EMAIL and ADMIN_PASSWORD variables below before running.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

// ── Configure admin credentials here ─────────────────────────────────────────
const ADMIN_EMAIL = "admin@food2go.com";
const ADMIN_PASSWORD = "admin123"; // Change this!
// ─────────────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB:", process.env.MONGO_URI);

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL} (role: ${existing.role})`);
    if (existing.role !== "admin") {
      existing.role = "admin";
      existing.isVerified = true;
      await existing.save();
      console.log("Updated role to admin.");
    }
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({
    email: ADMIN_EMAIL,
    passwordHash,
    role: "admin",
    isVerified: true,
  });

  console.log(`✅ Admin user created: ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log("   ⚠️  Change the password in production!");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
