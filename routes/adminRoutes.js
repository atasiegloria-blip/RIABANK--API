const express    = require("express");
const router     = express.Router();
const User       = require("../models/User");
const Account    = require("../models/Account");
const nodemailer = require("nodemailer");
const { validateBVN, createAccount, generateToken } = require("../services/nibssService");

// GET /api/admin/validate-bvn/:userId?action=approve|reject
router.get("/validate-bvn/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { action }  = req.query;

    if (!['approve','reject'].includes(action)) {
      return res.status(400).send("Invalid action.");
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).send("User not found.");

    const mailer = nodemailer.createTransport({
      host:    "smtp.gmail.com",
      port:    587,
      secure:  false,
      family:  4,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    if (action === 'reject') {
      user.isVerified         = false;
      user.verificationStatus = 'rejected';
      await user.save();

      await mailer.sendMail({
        from:    `"RIABANK" <${process.env.EMAIL_USER}>`,
        to:      user.email,
        subject: "RIABANK — BVN Verification Update",
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;">
            <h2 style="color:#C8973A;">RIABANK</h2>
            <p>Hello,</p>
            <p>Unfortunately we could not verify your BVN details.</p>
            <p>Please log in and request validation again with correct details.</p>
            <a href="${process.env.FRONTEND_URL}"
               style="display:inline-block;padding:12px 28px;background:#C8973A;
                      color:#0B1C3E;border-radius:8px;text-decoration:none;font-weight:bold;margin:20px 0;">
              Open RIABANK
            </a>
            <p style="color:#999;font-size:12px;">— RIABANK Team</p>
          </div>
        `
      });

      return res.send(`
        <html>
          <body style="font-family:sans-serif;text-align:center;padding:60px;background:#0B1C3E;color:#fff;">
            <h1 style="color:#C8973A;">RIABANK Admin</h1>
            <h2>❌ BVN Rejected</h2>
            <p>User <strong>${user.email}</strong> has been rejected.</p>
            <p>Notification email sent to user.</p>
          </body>
        </html>
      `);
    }

    // ── APPROVE ──
    // 1. Call NIBSS to validate BVN and get real name
    let firstName = user.firstName;
    let lastName  = user.lastName;
    let nibssAccountNumber = null;
    let nibssBalance       = 0;
    let nibssError         = null;

    try {
      // Format DOB to YYYY-MM-DD
      const formattedDob = user.dob
        ? new Date(user.dob).toISOString().split('T')[0]
        : null;

      console.log(`Validating BVN for ${user.email}: BVN=${user.bvn} DOB=${formattedDob}`);

      const bvnData = await validateBVN(user.bvn);
      if (bvnData && bvnData.success) {
        firstName = bvnData.data.firstName || firstName;
        lastName  = bvnData.data.lastName  || lastName;
        console.log(`BVN valid — Name: ${firstName} ${lastName}`);
      }

      // 2. Generate NIBSS token and create account
      const nibssToken = await generateToken({
        apiKey:    process.env.API_KEY,
        apiSecret: process.env.API_SECRET
      });

      const nibssAccount = await createAccount({
        kycType: "bvn",
        kycID:   user.bvn,
        dob:     formattedDob
      }, nibssToken);

      if (nibssAccount && nibssAccount.accountNumber) {
        nibssAccountNumber = nibssAccount.accountNumber;
        nibssBalance       = nibssAccount.balance || 0;
        console.log(`NIBSS account created: ${nibssAccountNumber}`);
      }

    } catch (nibssErr) {
      // NIBSS failed — still approve the user manually
      // They can create account later from dashboard
      nibssError = nibssErr.message;
      console.error("NIBSS error during approval:", nibssError);
    }

    // 3. Update user — mark as verified with real name
    user.firstName          = firstName;
    user.lastName           = lastName;
    user.isVerified         = true;
    user.verificationStatus = 'approved';
    await user.save();

    // 4. Save NIBSS account to MongoDB if created successfully
    if (nibssAccountNumber) {
      const existingAccount = await Account.findOne({ user: user._id });
      if (!existingAccount) {
        await Account.create({
          user:          user._id,
          accountNumber: nibssAccountNumber,
          balance:       nibssBalance
        });
        console.log(`Account saved to DB: ${nibssAccountNumber}`);
      }
    }

    // 5. Email user with result
    const accountInfo = nibssAccountNumber
      ? `<p>🏦 Your account number is: <strong style="font-size:20px;letter-spacing:2px;">${nibssAccountNumber}</strong></p>`
      : `<p>Your BVN is verified. Please log in to create your bank account.</p>`;

    await mailer.sendMail({
      from:    `"RIABANK" <${process.env.EMAIL_USER}>`,
      to:      user.email,
      subject: "RIABANK — Your BVN has been Verified ✅",
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px;">
          <h2 style="color:#C8973A;letter-spacing:3px;">RIABANK</h2>
          <p>Hello <strong>${firstName}</strong>,</p>
          <p>🎉 Great news! Your BVN has been successfully verified.</p>
          ${accountInfo}
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

    // 6. Show admin confirmation page
    res.send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;padding:60px;background:#0B1C3E;color:#fff;">
          <h1 style="color:#C8973A;">RIABANK Admin</h1>
          <h2>✅ BVN Approved</h2>
          <p>User: <strong>${user.email}</strong></p>
          <p>Name: <strong>${firstName} ${lastName}</strong></p>
          ${nibssAccountNumber
            ? `<p>Account Number: <strong style="color:#C8973A;">${nibssAccountNumber}</strong></p>`
            : `<p style="color:#f39c12;">⚠️ NIBSS account creation failed: ${nibssError}<br>User can create account manually from dashboard.</p>`
          }
          <p>Notification email sent to user.</p>
        </body>
      </html>
    `);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error: " + err.message);
  }
});

module.exports = router;
