const crypto = require("crypto");

/**
 * Generates a cryptographically random 6-digit numeric OTP string.
 * Uses crypto.randomInt to avoid modulo bias.
 */
function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

module.exports = generateOtp;
