const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { validateBVN } = require("../services/nibssService");
const { hashPassword, comparePassword } = require("../utils/helper");
// REGISTER + BVN VALIDATION
exports.register = async (req, res) => {
  try {
    const {  email, password, bvn } = req.body;

    // 1. Check if user exists
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 2. Validate BVN via NIBSS
    const bvnData = await validateBVN(bvn);

    if (!bvnData || !bvnData.success) {
      return res.status(400).json({ message: "Invalid BVN" });
    }
    

    const hashedPassword = await hashPassword(password);

    // 3. Create user in DB
    const user = await User.create({
      firstName: bvnData.data.firstName,
      lastName: bvnData.data.lastName,
      email,
      password: hashedPassword,
      bvn,
      dob: bvnData.data.dob,
      isVerified: true
    });

    res.status(201).json({
      message: "Onboarding successful",
      user
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};



exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isMatch = await comparePassword(password, user.password);

  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      id: user._id,
      email: email,
      firstName: user.firstName,
      lastName: user.lastName,
      bvn: user.bvn
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    token,
    user:  {
      id: user._id,
      email: email,
      firstName: user.firstName,
      lastName: user.lastName,
      bvn: user.bvn
    }
  });
};