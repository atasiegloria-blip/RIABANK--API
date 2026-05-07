const axios = require("axios");

exports.validateBVN = async (bvn) => {
  try {
    const response = await axios.post(
      `${process.env.NIBSS_BASE_URL}/api/validateBvn`,
      { bvn }
    );
    console.log("🔍 BVN RESPONSE:", response.data);
    return response.data;
  } catch (error) {
    console.log(error.response?.data || error.message);
    throw new Error("BVN validation failed");
  }
};

exports.createAccount = async ({ kycType, kycID, dob }, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    };
    const response = await axios.post(
      `${process.env.NIBSS_BASE_URL}/api/account/create`,
      { kycType, kycID, dob },
      config
    );
    console.log("🔍 ACCOUNT CREATION RESPONSE:", response.data.account);
    return response.data.account;
  } catch (error) {
    console.log(error.response?.data || error.message);
    throw new Error("Account creation failed");
  }
};

exports.generateToken = async ({ apiKey, apiSecret }) => {
  try {
    const response = await axios.post(
      `${process.env.NIBSS_BASE_URL}/api/auth/token`,
      { apiKey, apiSecret }
    );
    console.log("🔍 TOKEN RESPONSE:", response.data.token);
    return response.data.token;
  } catch (error) {
    console.log(error.response?.data || error.message);
    throw new Error("Token generation failed");
  }
};

// ✅ Updated — now accepts optional bankCode for inter-bank lookup
exports.nameEnquiry = async (accountNumber, token, bankCode = null) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    };

    // Build URL — append bankCode as query param if provided
    const url = bankCode
      ? `${process.env.NIBSS_BASE_URL}/api/account/name-enquiry/${accountNumber}?bankCode=${bankCode}`
      : `${process.env.NIBSS_BASE_URL}/api/account/name-enquiry/${accountNumber}`;

    const response = await axios.get(url, config);
    console.log("🔍 NAME ENQUIRY RESPONSE:", response.data);
    return response.data;
  } catch (error) {
    console.log(error.response?.data || error.message);
    throw new Error("Name enquiry failed");
  }
};

exports.nibssTransfer = async ({ from, to, amount }, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    };

    const response = await axios.post(
      `${process.env.NIBSS_BASE_URL}/api/transfer`,
      { from, to, amount }, // ← exactly what NIBSS expects
      config
    );
    console.log("🔍 TRANSFER RESPONSE:", response.data);
    return response.data;
  } catch (error) {
    console.log(error.response?.data || error.message);
    throw new Error("Transfer failed");
  }
};

exports.checkBalance = async (accountNumber, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    };
    const response = await axios.get(
      `${process.env.NIBSS_BASE_URL}/api/account/balance/${accountNumber}`,
      config
    );
    console.log("🔍 BALANCE RESPONSE:", response.data);
    return response.data;
  } catch (error) {
    console.log(error.response?.data || error.message);
    throw new Error("Check balance failed");
  }
};

exports.checkTransactionStatus = async (ref, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    };
    const response = await axios.get(
      `${process.env.NIBSS_BASE_URL}/api/transaction/${ref}`,
      config
    );
    console.log("🔍 STATUS RESPONSE:", response.data);
    return response.data;
  } catch (error) {
    console.log(error.response?.data || error.message);
    throw new Error("Check transaction status failed");
  }
};
