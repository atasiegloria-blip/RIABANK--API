const bcrypt = require("bcrypt")

exports.hashPassword = async (password) => {
  const saltOrRounds = 10;
  return await bcrypt.hash(password, saltOrRounds);
};

exports.comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};