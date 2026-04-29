const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  password: String,
  bvn: String,
  nin: String,
  dob: Date,
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
  
});

module.exports = mongoose.model("User", userSchema);