const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");

// Test route (so you know it works)
router.get("/", (req, res) => {
  res.send("Transaction route is working");
});

const {
  checkTransactionStatus,
  checkBalance,
  getHistory,
  transfer,
  getAccountName
} = require("../controllers/transactionController");

// name enquiry route
router.get("/name-enquiry/:accountNumber", getAccountName);

// transfer route
router.post("/transfer", auth, transfer);


// transaction history route (optional, not implemented in controller yet)
 router.get("/history", auth, getHistory);


 // balance check route (optional, not implemented in controller yet)
 router.get("/balance/:accountNumber", auth, checkBalance);

// check transaction status route (optional, not implemented in controller yet)
  router.get("/status/:ref", auth, checkTransactionStatus);
module.exports = router;

