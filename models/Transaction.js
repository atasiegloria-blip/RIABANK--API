const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "UserId" },
  from: String,
  to: String,
  amount: Number,
  transactionId: String,
  status: String
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);