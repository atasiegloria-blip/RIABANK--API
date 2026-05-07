const Account = require("../models/Account");
const User = require("../models/User");
const { createAccount, generateToken } = require("../services/nibssService");

exports.createAccount = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });

    // Ensure 1 account only
    const existing = await Account.findOne({ email: user.email });
    if (existing) {
      return res.status(400).json({ message: "User already has account" });
    }

    console.log(user)
    const token= await generateToken({
      apiKey: process.env.API_KEY,
      apiSecret: process.env.API_SECRET
    });

    console.log(token)
    // 🔹 Call NIBSS
    const nibssAccount = await createAccount({
      kycType: "bvn",
      kycID: user.bvn,
      dob: user.dob

    }, token);

    console.log(nibssAccount)

    const account = await Account.create({
      user: user._id,
      accountNumber: nibssAccount.accountNumber,
      balance: nibssAccount.balance
    });

    res.json(account);
  } catch (err) {
    res.status(500).json(err.message);
  }
};


exports.getAccount = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const account = await Account.findOne({ user: user._id });

    if (!account) {
      return res.status(404).json({ message: "No account found. Please create one first." });
    }

    res.json({
      accountNumber: account.accountNumber,
      balance: account.balance,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const account = await Account.findOne({ user: user._id });

    if (!account) {
      return res.status(404).json({ message: "No account found." });
    }

    // If your Account model has a transactions array use this:
    res.json({ transactions: account.transactions || [] });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
