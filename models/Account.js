const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "UserId" },
  accountNumber: String,
  balance: { type: Number, }
});

module.exports = mongoose.model("Account", accountSchema);