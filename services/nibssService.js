const axios= require("axios");

exports.validateBVN = async (bvn) => {
  try {
    const response = await axios.post(
      `${process.env.NIBSS_BASE_URL}/api/validateBvn`,
      { bvn }
    );

    console.log("🔍 BVN RESPONSE:", response.data); // ADD THIS

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
            'Authorization': `Bearer ${token}`, // Your captured JWT
            'Content-Type': 'application/json'  // Tells the 3rd party you're sending JSON
        }
    };

    const response = await axios.post(
      `${process.env.NIBSS_BASE_URL}/api/account/create`,
      { kycType, kycID, dob }, config
    );

    console.log("🔍 ACCOUNT CREATION RESPONSE:", response.data.account); // ADD THIS

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

    console.log("🔍 TOKEN GENERATION RESPONSE:", response.data.token); // ADD THIS

    return response.data.token;
  } catch (error) {
    console.log(error.response?.data || error.message);
    throw new Error("Token generation failed");
  }
};

exports.nameEnquiry = async (accountNumber, token) => {
  try {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    };

    const response = await axios.get(
      `${process.env.NIBSS_BASE_URL}/api/account/name-enquiry/${accountNumber}`,
      config
    );

    console.log("🔍 RESPONSE:", response.data);

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
      { from, to, amount },
      config
    );

    console.log("🔍 TRANSFER SUCCESSFUL RESPONSE:", response.data);

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

    console.log("🔍 RESPONSE:", response.data);

    return response.data;
  } catch (error) {
    console.log(error.response?.data || error.message);
    throw new Error("check balance failed");
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

    console.log("🔍 RESPONSE:", response.data);

    return response.data;
  } catch (error) {
    console.log(error.response?.data || error.message);
    throw new Error("check transaction status failed");
  }
};
