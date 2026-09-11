const nodemailer = require("nodemailer");

// Reuse a single transporter across the app
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS, // Gmail App Password (not your account password)
  },
});

/**
 * Send the 6-digit OTP to the given email address.
 * @param {string} email - Recipient email
 * @param {string} otp   - Plaintext 6-digit OTP
 */
async function sendOtpEmail(email, otp) {
  const expiresMinutes = process.env.OTP_EXPIRES_MINUTES || 10;

  const mailOptions = {
    from: `"Food2Go" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Your Food2Go Verification Code",
    text: `Your OTP is: ${otp}\n\nIt expires in ${expiresMinutes} minutes. Do not share it with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:8px;">
        <h2 style="color:#e63946;">Food2Go</h2>
        <p style="font-size:16px;">Use the code below to verify your email address:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#e63946;margin:24px 0;">
          ${otp}
        </div>
        <p style="color:#555;font-size:14px;">
          This code expires in <strong>${expiresMinutes} minutes</strong>.<br/>
          If you did not create a Food2Go account, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendOtpEmail;
