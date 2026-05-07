const Transaction = require("../models/Transaction");
const User = require("../models/User");
const Account = require("../models/Account");
const {
  nameEnquiry,
  nibssTransfer,
  generateToken,
  checkBalance: nibssCheckBalance,
  checkTransactionStatus: nibssCheckStatus
} = require("../services/nibssService");

// ─── helper so we don't repeat this 5 times ───
async function getNibssToken() {
  return generateToken({
    apiKey: process.env.API_KEY,
    apiSecret: process.env.API_SECRET
  });
}

// ─── helper to get verified user + account ───
async function getUserAndAccount(email) {
  const user = await User.findOne({ email });
  if (!user) throw { status: 404, message: "User not found" };

  const account = await Account.findOne({ user: user._id });
  if (!account) throw { status: 404, message: "Account not found" };

  return { user, account };
}

// -----------------------------
// NAME ENQUIRY  (no auth needed)
// -----------------------------
exports.getAccountName = async (req, res) => {
  const { accountNumber } = req.params;
  const { bankCode } = req.query; // ← add this

  try {
    const nibssToken = await getNibssToken();
    const result = await nameEnquiry(accountNumber, nibssToken, bankCode); // ← pass bankCode
    return res.json(result);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Name enquiry failed" });
  }
};

// -----------------------------
// TRANSFER
// -----------------------------
exports.transfer = async (req, res) => {
  const { from, to, amount } = req.body; // ← back to just these 3

  if (!from || !to || !amount) {
    return res.status(400).json({ message: "from, to and amount are required" });
  }

  try {
    const { user, account } = await getUserAndAccount(req.user.email);

    if (account.accountNumber !== from) {
      return res.status(403).json({ message: "Unauthorized: account mismatch" });
    }

    if (account.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const nibssToken = await getNibssToken();

    // NIBSS handles inter-bank routing automatically
    const response = await nibssTransfer({ from, to, amount }, nibssToken);

    account.balance -= Number(amount);
    await account.save();

    const tx = await Transaction.create({
      user: user._id,
      from,
      to,
      amount,
      transactionId: response.reference,
      status: response.status || "success"
    });

    return res.json({
      message: "Transfer successful",
      transaction: tx,
      newBalance: account.balance
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(err.status || 500).json({ message: err.message || "Transfer failed" });
  }
};
// -----------------------------
// TRANSACTION HISTORY
// -----------------------------
exports.getHistory = async (req, res) => {
  try {
    const { account } = await getUserAndAccount(req.user.email);

    const transactions = await Transaction.find({
      $or: [
        { from: account.accountNumber },
        { to: account.accountNumber }
      ]
    }).sort({ createdAt: -1 });

    return res.json(transactions);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(err.status || 500).json({ message: err.message || "Failed to get history" });
  }
};

// -----------------------------
// CHECK BALANCE  (live from NIBSS)
// -----------------------------
exports.checkBalance = async (req, res) => {
  const { accountNumber } = req.params;

  try {
    const { account } = await getUserAndAccount(req.user.email);

    if (account.accountNumber !== accountNumber) {
      return res.status(403).json({ message: "Unauthorized: account mismatch" });
    }

    const nibssToken = await getNibssToken();
    const result = await nibssCheckBalance(accountNumber, nibssToken);

    // Keep MongoDB in sync with whatever NIBSS says
    account.balance = result.balance ?? account.balance;
    await account.save();

    // Always return these 3 fields so the frontend knows what to expect
    return res.json({
      accountName: result.accountName,
      accountNumber: result.accountNumber || accountNumber,
      balance: result.balance
    });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(err.status || 500).json({ message: err.message || "Check balance failed" });
  }
};

// -----------------------------
// CHECK TRANSACTION STATUS
// -----------------------------
exports.checkTransactionStatus = async (req, res) => {
  const { ref } = req.params;

  try {
    const { user } = await getUserAndAccount(req.user.email);

    const transaction = await Transaction.findOne({
      user: user._id,
      transactionId: ref
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    const nibssToken = await getNibssToken();
    const result = await nibssCheckStatus(ref, nibssToken);

    // Update local status if NIBSS returns a new one
    if (result.status && result.status !== transaction.status) {
      transaction.status = result.status;
      await transaction.save();
    }

    return res.json(result);

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(err.status || 500).json({ message: err.message || "Check status failed" });
  }
};
