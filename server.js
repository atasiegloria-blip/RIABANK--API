const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");

dotenv.config(); // MUST BE FIRST

const connectDB = require("./config/db");
connectDB();

const app = express();

// ✅ CORS — allow requests from your Vercel frontend
app.use(cors());
app.use(express.json());

// Routes FIRST
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/account", require("./routes/accountRoutes"));
app.use("/api/transaction", require("./routes/transactionRoutes"));

// Static files LAST
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
