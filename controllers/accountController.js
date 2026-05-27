const Account = require("../models/Account");
const User = require("../models/User");
const { createAccount, generateToken } = require("../services/nibssService");

exports.createAccount = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Fix 1 — check by user._id not email
    const existing = await Account.findOne({ user: user._id });
    if (existing) {
      return res.status(400).json({ message: "You already have a bank account" });
    }

    // ✅ Fix 2 — check BVN and DOB exist before calling NIBSS
    if (!user.bvn) {
      return res.status(400).json({ message: "BVN is required to create an account" });
    }
    if (!user.dob) {
      return res.status(400).json({ message: "Date of birth is required to create an account" });
    }

    console.log("Creating account for:", user.email, "BVN:", user.bvn, "DOB:", user.dob);

    const token = await generateToken({
      apiKey:    process.env.API_KEY,
      apiSecret: process.env.API_SECRET
    });

    console.log("NIBSS token generated:", token ? "yes" : "no");

    // Call NIBSS to create account
    const nibssAccount = await createAccount({
      kycType: "bvn",
      kycID:   user.bvn,
      dob:     user.dob
    }, token);

    console.log("NIBSS account response:", nibssAccount);

    if (!nibssAccount || !nibssAccount.accountNumber) {
      return res.status(500).json({ message: "NIBSS did not return an account number. Try again." });
    }

    // Save account to MongoDB
    const account = await Account.create({
      user:          user._id,
      accountNumber: nibssAccount.accountNumber,
      balance:       nibssAccount.balance || 0
    });

    res.json({
      message:       "Bank account created successfully!",
      accountNumber: account.accountNumber,
      balance:       account.balance
    });

  } catch (err) {
    // ✅ Fix 3 — always return proper JSON error
    console.error("Create account error:", err.message);
    res.status(500).json({ message: err.message || "Could not create account" });
  }
};

exports.getAccount = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const account = await Account.findOne({ user: user._id });
    if (!account) {
      return res.status(404).json({ message: "No account found. Please create one first." });
    }

    res.json({
      accountNumber: account.accountNumber,
      balance:       account.balance,
      firstName:     user.firstName,
      lastName:      user.lastName,
      email:         user.email
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const account = await Account.findOne({ user: user._id });
    if (!account) {
      return res.status(404).json({ message: "No account found." });
    }

    res.json({ transactions: account.transactions || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
