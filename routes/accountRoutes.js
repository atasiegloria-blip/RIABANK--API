const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { createAccount, getAccount, getTransactions } = require("../controllers/accountController");

router.post("/create", auth, createAccount);
router.get("/me", auth, getAccount);           // ← get balance + account number
router.get("/transactions", auth, getTransactions); // ← get transaction history

module.exports = router;
