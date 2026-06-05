const User        = require("../models/User");
const jwt         = require("jsonwebtoken");
const crypto      = require("crypto");
const nodemailer  = require("nodemailer");
const { validateBVN }                  = require("../services/nibssService");
const { hashPassword, comparePassword } = require("../utils/helper");

// ─── Reusable email transporter ───
function getMailer() {
  return nodemailer.createTransport({
    host:   "smtp.gmail.com",
    port:   587,
    secure: false,
    family: 4, // forces IPv4
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

// ─── Reusable email sender ───
async function sendMail({ to, subject, html }) {
  const mailer = getMailer();
  await mailer.sendMail({
    from: `"RIABANK" <${process.env.EMAIL_USER}>`,
    to, subject, html
  });
}

// -----------------------------
// REGISTER
// POST /api/auth/register
// Body: { email, bvn, dob, password }
// ✅ Always creates as unverified — no NIBSS call
// User must request BVN validation after login
// -----------------------------
exports.register = async (req, res) => {
  try {
    const { email, password, bvn, dob } = req.body;

    if (!email || !password || !bvn || !dob) {
      return res.status(400).json({ message: "All fields are required including date of birth" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await hashPassword(password);

    // ✅ Always unverified on registration
    // Real name comes from NIBSS when admin approves BVN
    const user = await User.create({
      firstName:          "RIABANK",
      lastName:           "User",
      email,
      password:           hashedPassword,
      bvn,
      dob,
      isVerified:         false,
      verificationStatus: 'none'
    });

    res.status(201).json({
      message: "Registration successful! Please log in and request BVN validation to unlock your account.",
      user: {
        id:                 user._id,
        email:              user.email,
        firstName:          user.firstName,
        lastName:           user.lastName,
        isVerified:         false,
        verificationStatus: 'none'
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -----------------------------
// LOGIN
// POST /api/auth/login
// Body: { email, password }
// -----------------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id:                 user._id,
        email:              user.email,
        firstName:          user.firstName,
        lastName:           user.lastName,
        bvn:                user.bvn,
        isVerified:         user.isVerified,
        verificationStatus: user.verificationStatus
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: {
        id:                 user._id,
        email:              user.email,
        firstName:          user.firstName,
        lastName:           user.lastName,
        bvn:                user.bvn,
        dob:                user.dob,
        isVerified:         user.isVerified,
        verificationStatus: user.verificationStatus
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -----------------------------
// REQUEST BVN VALIDATION (user triggers this)
// POST /api/auth/request-bvn-validation
// Sends email to admin with user BVN + DOB
// -----------------------------
exports.requestBvnValidation = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Your BVN is already verified" });
    }

    if (user.verificationStatus === 'pending') {
      return res.status(400).json({ message: "Your BVN validation is already pending. Please wait for admin review." });
    }

    // Mark as pending
    user.verificationStatus = 'pending';
    await user.save();

    // Build admin approve/reject links
    const adminApproveURL = `${process.env.BACKEND_URL}/api/admin/validate-bvn/${user._id}?action=approve`;
    const adminRejectURL  = `${process.env.BACKEND_URL}/api/admin/validate-bvn/${user._id}?action=reject`;

    // Format DOB nicely for the email
    const dobFormatted = user.dob
      ? new Date(user.dob).toLocaleDateString('en-NG', { day:'numeric', month:'long', year:'numeric' })
      : 'Not provided';

    await sendMail({
      to:      process.env.EMAIL_USER,
      subject: `RIABANK — BVN Validation Request`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;">
          <h2 style="color:#C8973A;letter-spacing:3px;">RIABANK ADMIN</h2>
          <h3>New BVN Validation Request</h3>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr style="background:#f5f5f5;">
              <td style="padding:10px;font-weight:bold;">Email</td>
              <td style="padding:10px;">${user.email}</td>
            </tr>
            <tr>
              <td style="padding:10px;font-weight:bold;">BVN</td>
              <td style="padding:10px;font-size:18px;font-weight:bold;color:#333;">${user.bvn}</td>
            </tr>
            <tr style="background:#f5f5f5;">
              <td style="padding:10px;font-weight:bold;">Date of Birth</td>
              <td style="padding:10px;">${dobFormatted}</td>
            </tr>
            <tr>
              <td style="padding:10px;font-weight:bold;">User ID</td>
              <td style="padding:10px;font-size:12px;color:#999;">${user._id}</td>
            </tr>
            <tr style="background:#f5f5f5;">
              <td style="padding:10px;font-weight:bold;">Requested At</td>
              <td style="padding:10px;">${new Date().toLocaleString('en-NG')}</td>
            </tr>
          </table>
          <p style="margin-bottom:20px;">
            Cross-check the BVN and Date of Birth above, then click Approve or Reject:
          </p>
          <div style="margin:24px 0;">
            <a href="${adminApproveURL}"
               style="display:inline-block;padding:14px 32px;background:#27ae60;
                      color:#fff;border-radius:8px;text-decoration:none;
                      font-weight:bold;margin-right:16px;font-size:15px;">
              ✅ Approve BVN
            </a>
            <a href="${adminRejectURL}"
               style="display:inline-block;padding:14px 32px;background:#e74c3c;
                      color:#fff;border-radius:8px;text-decoration:none;
                      font-weight:bold;font-size:15px;">
              ❌ Reject BVN
            </a>
          </div>
          <p style="color:#999;font-size:12px;">— RIABANK System</p>
        </div>
      `
    });

    res.json({
      message: "BVN validation request sent! You will be notified by email once reviewed.",
      verificationStatus: 'pending'
    });

  } catch (error) {
    console.error("requestBvnValidation error:", error);
    res.status(500).json({ message: error.message });
  }
};

// -----------------------------
// VERIFY BVN (manual — user submits BVN + DOB directly)
// POST /api/auth/verify-bvn
// -----------------------------
exports.verifyBVN = async (req, res) => {
  try {
    const { bvn, dob } = req.body;

    if (!bvn || bvn.length !== 11) {
      return res.status(400).json({ message: "Enter a valid 11-digit BVN" });
    }

    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.isVerified) return res.status(400).json({ message: "Your BVN is already verified" });

    const bvnData = await validateBVN(bvn);
    if (!bvnData || !bvnData.success) {
      return res.status(400).json({ message: "BVN could not be verified. Check and try again." });
    }

    user.firstName          = bvnData.data.firstName || user.firstName;
    user.lastName           = bvnData.data.lastName  || user.lastName;
    user.dob                = bvnData.data.dob       || dob;
    user.bvn                = bvn;
    user.isVerified         = true;
    user.verificationStatus = 'approved';
    await user.save();

    return res.json({
      message: "BVN verified successfully!",
      user: {
        firstName:          user.firstName,
        lastName:           user.lastName,
        isVerified:         user.isVerified,
        verificationStatus: user.verificationStatus
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -----------------------------
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// Body: { email }
// -----------------------------
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether email exists — security best practice
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    const resetToken  = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken  = hashedToken;
    user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    const resetURL = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await sendMail({
      to:      user.email,
      subject: "RIABANK — Password Reset Request",
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;">
          <h2 style="color:#C8973A;letter-spacing:3px;">RIABANK</h2>
          <p>Hello <strong>${user.firstName}</strong>,</p>
          <p>You requested a password reset. Click the button below to set a new password.</p>
          <p>This link expires in <strong>15 minutes</strong>.</p>
          <a href="${resetURL}"
             style="display:inline-block;padding:12px 28px;background:#C8973A;
                    color:#0B1C3E;border-radius:8px;text-decoration:none;
                    font-weight:bold;margin:20px 0;">
            Reset My Password
          </a>
          <p style="color:#999;font-size:12px;">
            If you didn't request this, simply ignore this email. Your password will not change.
          </p>
          <p style="color:#999;font-size:12px;">— RIABANK Security Team</p>
        </div>
      `
    });

    res.json({ message: "If that email exists, a reset link has been sent." });

  } catch (error) {
    console.error("forgotPassword error:", error);
    res.status(500).json({ message: "Could not send reset email. Try again later." });
  }
};

// -----------------------------
// RESET PASSWORD
// POST /api/auth/reset-password
// Body: { email, token, newPassword }
// -----------------------------
exports.resetPassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordToken:  hashedToken,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Reset link is invalid or has expired. Please request a new one." });
    }

    user.password            = await hashPassword(newPassword);
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successful! You can now log in." });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
