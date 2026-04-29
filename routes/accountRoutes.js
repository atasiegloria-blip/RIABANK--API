const router = require("express").Router();
const auth = require("../middleware/authMiddleware");
const { createAccount } = require("../controllers/accountController");

router.post("/create", auth, createAccount);

module.exports = router;