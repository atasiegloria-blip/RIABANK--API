const express = require("express");
const router  = express.Router();
const User    = require("../models/User");
const nodemailer = require("nodemailer");

// Admin clicks approve/reject link from email
// GET /api/admin/validate-bvn/:userId?action=approve|reject
router.get("/validate-bvn/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { action }  = req.query; // 'approve' or 'reject'

    if (!['approve','reject'].includes(action)) {
      return res.status(400).send("Invalid action.");
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found.");

    const approved = action === 'approve';

    user.isVerified         = approved;
    user.verificationStatus = approved ? 'approved' : 'rejected';
    if (approved) {
      user.firstName = user.firstName === 'RIABANK' ? user.firstName : user.firstName;
    }
    await user.save();

    // Email the user about the result
   const mailer = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4, // ← forces IPv4
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

    await mailer.sendMail({
      from:    `"RIABANK" <${process.env.EMAIL_USER}>`,
      to:      user.email,
      subject: approved
        ? "RIABANK — Your BVN has been Verified ✅"
        : "RIABANK — BVN Verification Update",
      html: approved ? `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;">
          <h2 style="color:#C8973A;">RIABANK</h2>
          <p>Hello <strong>${user.firstName}</strong>,</p>
          <p>🎉 Great news! Your BVN has been successfully verified.</p>
          <p>You can now log in to RIABANK and create your bank account.</p>
          <a href="${process.env.FRONTEND_URL}"
             style="display:inline-block;padding:12px 28px;background:#C8973A;
                    color:#0B1C3E;border-radius:8px;text-decoration:none;
                    font-weight:bold;margin:20px 0;">
            Open RIABANK
          </a>
          <p style="color:#999;font-size:12px;">— RIABANK Team</p>
        </div>
      ` : `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;">
          <h2 style="color:#C8973A;">RIABANK</h2>
          <p>Hello <strong>${user.firstName}</strong>,</p>
          <p>Unfortunately, we could not verify your BVN details.</p>
          <p>Please log in and request validation again with correct details.</p>
          <a href="${process.env.FRONTEND_URL}"
             style="display:inline-block;padding:12px 28px;background:#C8973A;
                    color:#0B1C3E;border-radius:8px;text-decoration:none;
                    font-weight:bold;margin:20px 0;">
            Open RIABANK
          </a>
          <p style="color:#999;font-size:12px;">— RIABANK Team</p>
        </div>
      `
    });

    // Show admin a simple confirmation page
    res.send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;padding:60px;background:#0B1C3E;color:#fff;">
          <h1 style="color:#C8973A;">RIABANK Admin</h1>
          <h2>${approved ? '✅ BVN Approved' : '❌ BVN Rejected'}</h2>
          <p>User <strong>${user.email}</strong> has been ${approved ? 'verified' : 'rejected'}.</p>
          <p>A notification email has been sent to the user.</p>
        </body>
      </html>
    `);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error: " + err.message);
  }
});

module.exports = router;
