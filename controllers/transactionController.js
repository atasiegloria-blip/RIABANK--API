const axios = require("axios");
const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Account = require("../models/Account");
const { nameEnquiry, nibssTransfer, generateToken, checkBalance, checkTransactionStatus } = require("../services/nibssService");


// -----------------------------
// NAME ENQUIRY
// -----------------------------
exports.getAccountName = async (req, res) => {
  const { accountNumber } = req.params;

  try {
    const token = req.headers.authorization?.split(" ")[1]; // 🔥 extract token

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

   const nibssToken= await generateToken({
      apiKey: process.env.API_KEY,
      apiSecret: process.env.API_SECRET
    });

    const result = await nameEnquiry(accountNumber, nibssToken);

    return res.json(result);

  } catch (err) {
    console.log(err.response?.data || err.message);
    res.status(500).json({ message: "Name enquiry failed" });
  }
};


// -----------------------------
// TRANSFER
// -----------------------------
exports.transfer = async (req, res) => {
  const { from, to, amount } = req.body;

  try {
    const  user= await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


     const  account= await Account.findOne({ user: user._id });
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    if(account.accountNumber !== from){
      return res.status(403).json({ message: "Unauthorized" });
    }

const nibssToken= await generateToken({
      apiKey: process.env.API_KEY,
      apiSecret: process.env.API_SECRET
    });

    // 1. Call NIBSS transfer API
    const response = await nibssTransfer({ from, to, amount }, nibssToken);

    // 2. Save transaction locally
    const tx = await Transaction.create({
      from,
      to,
      amount,
      transactionId: response.reference,
      status: response.status
    });

    // 3. RETURN RESPONSE (THIS WAS MISSING)
    return res.json(tx);

  } catch (err) {
    console.log(err.response?.data || err.message);
    res.status(500).json({ message: "Transfer failed" });
  }
};


exports.getHistory = async (req, res) => {

  try {

    const  user= await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


     const  account= await Account.findOne({ user: user._id });
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }


    const transactions = await Transaction.find({
      $or: [{ from: account.accountNumber }, { to: account.accountNumber }]
    }).sort({ createdAt: -1 });


    // 3. RETURN RESPONSE (THIS WAS MISSING)
    return res.json(transactions);

  } catch (err) {
    console.log(err.response?.data || err.message);
    res.status(500).json({ message: "failed to get history" });
  }
};


exports.checkBalance = async (req, res) => {
  const { accountNumber } = req.params;

  try {
    
     const  user= await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


     const  account= await Account.findOne({ user: user._id });
    if (!account) {
      return res.status(404).json({ message: "Account not found" });
    }

    if(account.accountNumber !== accountNumber){
      return res.status(403).json({ message: "Unauthorized" });
    }
   const nibssToken= await generateToken({
      apiKey: process.env.API_KEY,
      apiSecret: process.env.API_SECRET
    });

    const result = await checkBalance(accountNumber, nibssToken);

    return res.json(result);

  } catch (err) {
    console.log(err.response?.data || err.message);
    res.status(500).json({ message: "Check balance failed" });
  }
};

exports.checkTransactionStatus = async (req, res) => {
  const { ref } = req.params;

  try {
    
     const  user= await User.findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


     const  transactions= await Transaction.find({ user: user._id });
    if (transactions.length === 0) {
      return res.status(404).json({ message: "Transaction not found" });
    }


      const transaction = transactions.find(tx => tx.transactionId === ref);
    if(transaction.transactionId !== ref){
      return res.status(403).json({ message: "Unauthorized" });
    }
   const nibssToken= await generateToken({
      apiKey: process.env.API_KEY,
      apiSecret: process.env.API_SECRET
    });

    const result = await checkTransactionStatus(ref, nibssToken);

    return res.json(result);

  } catch (err) {
    console.log(err.response?.data || err.message);
    res.status(500).json({ message: "Check transaction status failed" });
  }
};