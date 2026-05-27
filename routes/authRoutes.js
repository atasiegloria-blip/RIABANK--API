const express = require("express");
const router  = express.Router();
const auth    = require("../middleware/authMiddleware");
const {
  register,
  login,
  verifyBVN,
  requestBvnValidation,
  forgotPassword,
  resetPassword
} = require("../controllers/authController");

router.post("/register",               register);
router.post("/login",                  login);
router.post("/verify-bvn",        auth, verifyBVN);
router.post("/request-bvn-validation", auth, requestBvnValidation); 
router.post("/forgot-password",        forgotPassword);
router.post("/reset-password",         resetPassword);

module.exports = router;
