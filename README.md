# 💳 RiaBank API

A fintech backend API built with Node.js and Express that supports user authentication, account management, transaction processing, and integration with the NibssByPhoenix API.



## 🚀 Features

* 🔐 User Registration & Login (JWT Authentication)
* 🆔 BVN Validation
* 🏦 Account Creation
* 🔎 Account Name Enquiry
* 💸 Fund Transfer
* 📜 Transaction History Tracking
* 🔒 Proper Data Isolation (users can only access their own data)
* 🔗 External API Integration (NibssByPhoenix)



## 🔐 Data Security & Isolation

This system enforces strict data access control:

* Each user can only access their own:

  * Account details
  * Transactions
* No customer can view or interact with another customer’s data
* Authentication is handled using JWT tokens

## 🔗 NibssByPhoenix API Integration

This project integrates with the **NibssByPhoenix API** for core banking operations.

### 🪪 Onboarding Process

To get started with the API:

1. Call the onboarding endpoint

2. Provide:

   * Your email address
   * Your company (bank) name

3. You will receive API credentials via email

4. Use the credentials to:

   * Generate authentication tokens
   * Access protected endpoints (BVN validation, account creation, transfers, etc.)



## 🛠️ Tech Stack

* Node.js
* Express.js
* MongoDB (Mongoose)
* JWT Authentication
* Axios
* dotenv


## 📁 Project Structure

```id="struct01"
riabank/
│
├── config/
│   └── db.js
│
├── controllers/
│   ├── authController.js
│   ├── accountController.js
│   └── transactionController.js
│
├── models/
│   ├── User.js
│   ├── Account.js
│   └── Transaction.js
│
├── routes/
│   ├── authRoutes.js
│   ├── accountRoutes.js
│   └── transactionRoutes.js
│
├── services/
│   └── nibssService.js
│
├── .env
├── server.js
└── package.json
```


## ⚙️ Installation

1. Clone the repository:

```id="inst01"
git clone https://github.com/your-username/riabank.git
cd riabank
```

2. Install dependencies:

```id="inst02"
npm install
```

3. Create a `.env` file:

```id="env01"
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret_key
NIBSS_BASE_URL=https://your-api-url
```

4. Start the server:

```id="run01"
npm run dev
```



## 🔑 API Endpoints

### 🔐 Auth

* `POST /api/auth/register` → Register user
* `POST /api/auth/login` → Login user



### 🏦 Account

* `POST /api/account/create` → Create account
* `POST /api/account/validate-bvn` → Validate BVN



### 🔎 Transactions

* `GET /api/transaction/name-enquiry/:accountNumber` → Get account name
* `POST /api/transaction/transfer` → Transfer funds
* `GET /api/transaction/history` → Get user transaction history



## 🔄 API Flow

1. Register / Login user
2. Authenticate user (JWT)
3. Validate BVN
4. Create Account
5. Perform Name Enquiry
6. Execute Transfer
7. View Transaction History



## 🧪 Testing

Use Postman or any API client to test endpoints.



## 📌 Notes

* All protected routes require a valid JWT token
* External API must be active and accessible
* MongoDB Atlas must allow your IP address
* Ensure correct API credentials are used for NibssByPhoenix integration


## 👤 Author

**Your Name**



## 📄 License

ISC License
