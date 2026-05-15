const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { validateBVN } = require("../services/nibssService");
const { hashPassword, comparePassword } = require("../utils/helper");

// -----------------------------
// REGISTER + BVN VALIDATION
// -----------------------------
exports.register = async (req, res) => {
  try {
    const { email, password, bvn } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 2. Try to validate BVN via NIBSS — but don't block registration if it fails
    let firstName  = "RIABANK";
    let lastName   = "User";
    let dob        = null;
    let isVerified = false;

    try {
      const bvnData = await validateBVN(bvn);
      if (bvnData && bvnData.success) {
        firstName  = bvnData.data.firstName || firstName;
        lastName   = bvnData.data.lastName  || lastName;
        dob        = bvnData.data.dob       || null;
        isVerified = true;
      }
    } catch (_) {
      isVerified = false;
    }

    // 3. Hash password and create user
    const hashedPassword = await hashPassword(password);

    const user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      bvn,
      dob,
      isVerified
    });

    res.status(201).json({
      message: isVerified
        ? "Registration successful. BVN verified."
        : "Registration successful. BVN could not be verified — account marked as unverified.",
      user: {
        id:         user._id,
        email:      user.email,
        firstName:  user.firstName,
        lastName:   user.lastName,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -----------------------------
// LOGIN
// -----------------------------
exports.login = async (req, res) => {
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
      id:        user._id,
      email:     user.email,
      firstName: user.firstName,
      lastName:  user.lastName,
      bvn:       user.bvn,
      isVerified: user.isVerified
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    token,
    user: {
      id:         user._id,
      email:      user.email,
      firstName:  user.firstName,
      lastName:   user.lastName,
      bvn:        user.bvn,
      isVerified: user.isVerified
    }
  });
};

// -----------------------------
// VERIFY BVN
// -----------------------------
exports.verifyBVN = async (req, res) => {
  try {
    const { bvn, dob } = req.body;

    if (!bvn || bvn.length !== 11) {
      return res.status(400).json({ message: "Enter a valid 11-digit BVN" });
    }

    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Your BVN is already verified" });
    }

    const bvnData = await validateBVN(bvn);

    if (!bvnData || !bvnData.success) {
      return res.status(400).json({ message: "BVN could not be verified. Check and try again." });
    }

    user.firstName  = bvnData.data.firstName || user.firstName;
    user.lastName   = bvnData.data.lastName  || user.lastName;
    user.dob        = bvnData.data.dob       || dob;
    user.bvn        = bvn;
    user.isVerified = true;
    await user.save();

    return res.json({
      message: "BVN verified successfully!",
      user: {
        firstName:  user.firstName,
        lastName:   user.lastName,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// -----------------------------
// FORGOT PASSWORD
// -----------------------------
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists — security best practice
      return res.json({
        message: "If that email exists, a reset link has been sent."
      });
    }

    // 1. Generate reset token
    const resetToken  = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const tokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    // 2. Save token to user
    user.resetPasswordToken  = hashedToken;
    user.resetPasswordExpiry = tokenExpiry;
    await user.save();

    // 3. Build reset URL
    const resetURL = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}&email=${email}`;

    // 4. Send email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from:    `"RIABANK Security" <${process.env.EMAIL_USER}>`,
      to:      user.email,
      subject: "RIABANK — Password Reset Request",
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;">
          <h2 style="color:#C8973A;letter-spacing:3px;">RIABANK</h2>
          <p>Hello <strong>${user.firstName}</strong>,</p>
          <p>You requested a password reset. Click the button below to set a new password.</p>
          <p>This link expires in <strong>15 minutes</strong>.</p>
          <a href="${resetURL}"
             style="display:inline-block;padding:12px 28px;
                    background:#C8973A;color:#0B1C3E;
                    border-radius:8px;text-decoration:none;
                    font-weight:bold;margin:20px 0;">
            Reset My Password
          </a>
          <p style="color:#999;font-size:12px;">
            If you didn't request this, ignore this email.
            Your password will not change.
          </p>
          <p style="color:#999;font-size:12px;">— RIABANK Security Team</p>
        </div>
      `
    });

    res.json({
      message: "If that email exists, a reset link has been sent."
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not send reset email. Try again." });
  }
};

// -----------------------------
// RESET PASSWORD
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

    // 1. Hash the token from URL to compare with DB
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 2. Find user with valid token that hasn't expired
    const user = await User.findOne({
      email,
      resetPasswordToken:  hashedToken,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: "Reset link is invalid or has expired. Please request a new one."
      });
    }

    // 3. Update password and clear reset fields
    user.password            = await hashPassword(newPassword);
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successful! You can now log in." });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
