const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName:           { type: String },
  lastName:            { type: String },
  email:               { type: String, required: true, unique: true },
  password:            { type: String, required: true },
  bvn:                 { type: String },
  dob:                 { type: String },
  isVerified:          { type: Boolean, default: false },
  verificationStatus:  { type: String, enum: ['pending', 'approved', 'rejected', 'none'], default: 'none' },
  resetPasswordToken:  { type: String },
  resetPasswordExpiry: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
