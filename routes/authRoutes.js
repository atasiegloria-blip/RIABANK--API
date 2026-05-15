const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const { 
  register, 
  login, 
  verifyBVN,
  forgotPassword,
  resetPassword
} = require("../controllers/authController");

// onboarding routes
router.post("/register",        register);
router.post("/login",           login);

// BVN verification (requires login)
router.post("/verify-bvn",      auth, verifyBVN);

// Password reset (no auth needed)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password",  resetPassword);

module.exports = router;
