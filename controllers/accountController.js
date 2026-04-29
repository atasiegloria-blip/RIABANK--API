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