const express = require("express");
const app = express();
const cors = require("cors");
const helmet = require("helmet");
const ApiContracts = require("authorizenet").APIContracts;
const ApiControllers = require("authorizenet").APIControllers;
const SDKConstants = require("authorizenet").Constants;
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();
connectDB();

// Initialize Supabase Admin Client (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabaseAdmin = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// Response compression for reduced bandwidth
const compression = require("compression");
app.use(compression({
  level: 6, // Balanced compression level
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Simple in-memory rate limiter (no extra dependency needed)
const rateLimitStore = new Map();

const createRateLimiter = (windowMs, maxRequests, bucket = "default") => {
  return (req, res, next) => {
    const forwardedFor = req.headers["x-forwarded-for"];
    const forwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : (forwardedFor || "").split(",")[0].trim();
    const clientIp = forwardedIp || req.ip || "unknown";
    const key = `${bucket}:${clientIp}`;
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const record = rateLimitStore.get(key);
    
    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
      });
    }
    
    record.count++;
    next();
  };
};

// Rate limiters
const generalLimiter = createRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 45 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  "general"
);

const emailLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  parseInt(process.env.EMAIL_RATE_LIMIT_MAX) || 40, // 10 emails per 15 min
  "email"
);

// Clean up old rate limit entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 30 * 60 * 1000);

// body parser
const requestBodyLimit = process.env.REQUEST_BODY_LIMIT || "10mb";
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    // API server response hardening; frontend CSP should be set at CDN/web tier.
    contentSecurityPolicy: false,
  })
);
app.use(express.json({ limit: requestBodyLimit }));
app.use(express.urlencoded({ limit: requestBodyLimit, extended: true }));
const cookieParser = require("cookie-parser");

const logger = require("morgan");


const { orderSatusCtrl, orderPlacedCtrl, purchaseOrderEmailCtrl, userNotificationCtrl, contactCtrl, customization, accountActivation, paymentLink, paymentLinkCtrl, adminAccountActivation, updateProfileNotification, paymentSuccessFull, groupInvitationCtrl } = require("./controllers/orderStatus");
const { invoicesCtrl } = require("./controllers/quickBooks");
const { requireAuth, requireAdmin } = require("./middleware/auth");

app.use(logger("dev"));

app.use(cookieParser());

// CORS setup
const allowedOrigins = [
  "https://9rx.vercel.app",
  "http://localhost:8080",
  "http://localhost:3000", // Added for local development
  "http://localhost:3001",
  "http://localhost:3002",
  "https://www.9rx.com",
  "https://9rx.com",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Content-Disposition"],
    exposedHeaders: ["Content-Disposition"], // Include this
    optionsSuccessStatus: 200, // Address potential preflight request issues
  })
);

// Apply general rate limiter before sensitive routes.
app.use(generalLimiter);

const API_LOGIN_ID = process.env.AUTHORIZE_NET_API_LOGIN_ID;
const TRANSACTION_KEY = process.env.AUTHORIZE_NET_TRANSACTION_KEY;
// const ENVIRONMENT = SDKConstants.endpoint.production; 
const ENVIRONMENT = SDKConstants.endpoint.sandbox;

if (!API_LOGIN_ID || !TRANSACTION_KEY) {
  console.error("Missing Authorize.Net API credentials");
  process.exit(1);
}

function createMerchantAuthenticationType() {
  const merchantAuthenticationType =
    new ApiContracts.MerchantAuthenticationType();
  merchantAuthenticationType.setName(API_LOGIN_ID);
  merchantAuthenticationType.setTransactionKey(TRANSACTION_KEY);
  return merchantAuthenticationType;
}

async function createAuthorizeCustomerProfile(endpoint, apiLoginId, transactionKey, email, profileId) {
  const shortProfileId = String(profileId || "").replace(/-/g, "").substring(0, 20);
  const requestBody = {
    createCustomerProfileRequest: {
      merchantAuthentication: { name: apiLoginId, transactionKey },
      profile: { merchantCustomerId: shortProfileId, email },
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const responseText = await response.text();
    const result = JSON.parse(responseText.replace(/^\uFEFF/, ""));

    if (result.messages?.resultCode === "Ok") {
      return { success: true, customerProfileId: result.customerProfileId };
    }
    if (result.messages?.message?.[0]?.code === "E00039") {
      const match = result.messages.message[0].text.match(/ID (\d+)/);
      if (match) {
        return { success: true, customerProfileId: match[1] };
      }
    }

    return {
      success: false,
      error: result.messages?.message?.[0]?.text || "Failed to create customer profile",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function createAuthorizePaymentProfile(endpoint, apiLoginId, transactionKey, customerProfileId, cardNumber, expirationDate, cvv, billing) {
  const expDate = String(expirationDate || "").replace(/[\/\s-]/g, "");
  const formattedExpDate =
    expDate.length === 4
      ? `20${expDate.substring(2, 4)}-${expDate.substring(0, 2)}`
      : expDate;

  const requestBody = {
    createCustomerPaymentProfileRequest: {
      merchantAuthentication: { name: apiLoginId, transactionKey },
      customerProfileId,
      paymentProfile: {
        billTo: {
          firstName: billing?.firstName || "Customer",
          lastName: billing?.lastName || "Customer",
          address: billing?.address || "",
          city: billing?.city || "",
          state: billing?.state || "",
          zip: billing?.zip || "",
          country: billing?.country || "USA",
        },
        payment: {
          creditCard: {
            cardNumber: String(cardNumber || "").replace(/\s/g, ""),
            expirationDate: formattedExpDate,
            cardCode: String(cvv || ""),
          },
        },
      },
      validationMode: "liveMode",
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const responseText = await response.text();
    const result = JSON.parse(responseText.replace(/^\uFEFF/, ""));

    if (result.messages?.resultCode === "Ok") {
      return { success: true, paymentProfileId: result.customerPaymentProfileId };
    }
    if (result.messages?.message?.[0]?.code === "E00039") {
      const match = result.messages.message[0].text.match(/ID (\d+)/);
      if (match) {
        return { success: true, paymentProfileId: match[1] };
      }
    }

    return {
      success: false,
      error: result.messages?.message?.[0]?.text || "Failed to create payment profile",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

app.post("/pay", requireAuth, async (req, res) => {
  try {

    // Destructure request body
    const {
      invoiceNumber ,
      amount: rawAmount,
      cardNumber,
      expirationDate,
      cvv,
      cardholderName,
      address,
      city,
      state,
      zip: rawZip,
      country
    } = req.body;

    // Convert necessary fields
    const amount = rawAmount ? parseFloat(rawAmount) : 0; // Convert amount to number safely
    const zip = rawZip ? parseInt(rawZip, 10) : 0; // Convert zip to number safely
    const formattedExpirationDate = expirationDate.toString().padStart(4, '0');

    // Ensure cardNumber, expirationDate, and cvv remain strings
  
    // Validate required fields
    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }
    if (cardNumber && (!expirationDate || !cvv || !cardholderName)) {
      return res.status(400).json({ error: "Incomplete credit card details" });
    }
    // if (accountNumber && (!accountType || !routingNumber || !nameOnAccount)) {
    //   return res.status(400).json({ error: "Incomplete bank account details" });
    // }

    // Create merchant authentication
    const merchantAuthenticationType = createMerchantAuthenticationType();


    // Set up payment method (Credit Card only - ACH uses /pay-ach endpoint)
    let paymentType;
    if (cardNumber) {
      const creditCard = new ApiContracts.CreditCardType();
      creditCard.setCardNumber(cardNumber);
      creditCard.setExpirationDate(expirationDate);
      creditCard.setCardCode(cvv);
      paymentType = new ApiContracts.PaymentType();
      paymentType.setCreditCard(creditCard);
    } else {
      return res.status(400).json({ error: "Card number is required" });
    }

    // Create order details
    const orderDetails = new ApiContracts.OrderType();
    orderDetails.setInvoiceNumber(invoiceNumber || `INV-${Math.floor(Math.random() * 100000)}`);
    orderDetails.setDescription("Product Description");

    // Set billing information
    const billTo = new ApiContracts.CustomerAddressType();
    const nameParts = (cardholderName || "Customer").split(" ");
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

    billTo.setFirstName(firstName || "Customer");
    billTo.setLastName(lastName || "Customer");
    // Add these required fields to avoid null values
    billTo.setAddress(address);
    billTo.setCity(city);
    billTo.setState(state);
    billTo.setZip(zip);
    billTo.setCountry(country);

    // Create transaction request
    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
    );
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(amount);
    transactionRequestType.setOrder(orderDetails);
    transactionRequestType.setBillTo(billTo);

    // Create request
    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);
    createRequest.setRefId(Math.floor(Math.random() * 1000000).toString());

    // Execute request
    const ctrl = new ApiControllers.CreateTransactionController(
      createRequest.getJSON()
    );

    // Set environment
    ctrl.setEnvironment(ENVIRONMENT);

    await ctrl.execute(function () {
      try {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.CreateTransactionResponse(
          apiResponse
        );

        if (!response) {
          return res
            .status(500)
            .json({ error: "Invalid response from payment gateway" });
        }

        if (
          response.getMessages() &&
          response.getMessages().getResultCode() ===
          ApiContracts.MessageTypeEnum.OK
        ) {
          const transactionResponse = response.getTransactionResponse();


          if (
            transactionResponse &&
            transactionResponse.getResponseCode() === "1"
          ) {
            return res.json({
              success: true,
              message: "Transaction Approved!",
              transactionId: transactionResponse.getTransId(),
            });
          } else {
            let errorMessage = "Transaction Declined";
            if (
              transactionResponse &&
              transactionResponse.getErrors() &&
              transactionResponse.getErrors().getError()
            ) {
              console.error("Payment API Error:", transactionResponse.getErrors());

              const errors = transactionResponse.getErrors().getError();
              if (errors.length > 0) {
                errorMessage = errors[0].getErrorText();
              }
            }
            return res.status(400).json({
              success: false,
              message: "Transaction Declined",
              error: errorMessage,
            });
          }
        } else {
          let errorMessage = "Transaction Failed";
          let errorCode = null;
          if (response.getMessages() && response.getMessages().getMessage()) {
            const messages = response.getMessages().getMessage();
            if (messages.length > 0) {
              errorMessage = messages[0].getText();
              errorCode = messages[0].code;
            }
          }
          return res.status(400).json({
            success: false,
            message: "Transaction Failed",
            error: errorMessage,
            errorCode: errorCode
          });
        }
      } catch (error) {
        console.error("Error processing response:", error);
        return res
          .status(500)
          .json({
            error: "Error processing payment response",
          });
      }
    });
  } catch (error) {
    console.error("Unexpected Server Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error" });
  }
});

// FortisPay ACH Payment Endpoint
app.post("/pay-ach-fortispay", requireAuth, async (req, res) => {
  try {
    const {
      invoiceNumber,
      amount: rawAmount,
      accountType,
      routingNumber,
      accountNumber,
      nameOnAccount,
      address,
      city,
      state,
      zip: rawZip,
      country,
      orderId,
      description,
      secCode = "WEB",
      // Optional identity verification fields
      checkNumber,
      dlNumber,
      dlState,
      ssn4,
      dobYear,
    } = req.body;

    const amount = rawAmount ? parseFloat(rawAmount) : 0;
    const zip = rawZip ? String(rawZip) : "";

    // Validate required fields
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }
    if (!routingNumber || !accountNumber || !nameOnAccount) {
      return res.status(400).json({ error: "Incomplete bank account details" });
    }

    // Validate FortisPay credentials
    const FORTIS_API_URL = process.env.FORTIS_API_URL || process.env.VITE_FORTIS_API_URL || "https://api.fortispay.com/v2";
    const FORTIS_USER_ID = process.env.FORTIS_USER_ID || process.env.VITE_FORTIS_USER_ID;
    const FORTIS_USER_API_KEY = process.env.FORTIS_USER_API_KEY || process.env.VITE_FORTIS_USER_API_KEY;
    const FORTIS_LOCATION_ID = process.env.FORTIS_LOCATION_ID || process.env.VITE_FORTIS_LOCATION_ID;
    const FORTIS_PRODUCT_TRANSACTION_ID = process.env.FORTIS_PRODUCT_TRANSACTION_ID_ACH || process.env.VITE_FORTIS_PRODUCT_TRANSACTION_ID_ACH;

    if (!FORTIS_USER_ID || !FORTIS_USER_API_KEY || !FORTIS_LOCATION_ID || !FORTIS_PRODUCT_TRANSACTION_ID) {
      return res.status(500).json({ 
        error: "FortisPay configuration missing",
        message: "Please configure FortisPay API credentials" 
      });
    }

    // Map account type to FortisPay format
    let fortisAccountType = "checking";
    if (accountType?.toLowerCase() === "savings") {
      fortisAccountType = "savings";
    }

    // Build FortisPay transaction request
    const transactionRequest = {
      transaction: {
        action: "debit",
        payment_method: "ach",
        account_holder_name: nameOnAccount,
        account_number: accountNumber,
        account_type: fortisAccountType,
        routing: routingNumber,
        ach_sec_code: secCode,
        transaction_amount: amount.toFixed(2),
        location_id: FORTIS_LOCATION_ID,
        product_transaction_id: FORTIS_PRODUCT_TRANSACTION_ID,
        
        // Billing information
        billing_street: address || "",
        billing_city: city || "",
        billing_state: state || "",
        billing_zip: zip || "",
        
        // Optional fields
        description: description || "ACH Payment",
        order_num: orderId || invoiceNumber,
        check_number: checkNumber,
        
        // Identity verification (optional)
        dl_number: dlNumber,
        dl_state: dlState,
        ssn4: ssn4,
        dob_year: dobYear,
        
        // Effective date
        effective_date: new Date().toISOString().split('T')[0],
      },
    };

    // Make API request to FortisPay
    const axios = require("axios");
    const response = await axios.post(`${FORTIS_API_URL}/transactions`, transactionRequest, {
      headers: {
        "Content-Type": "application/json",
        "user-id": FORTIS_USER_ID,
        "user-api-key": FORTIS_USER_API_KEY,
      },
    });

    const result = response.data;

    // Parse FortisPay response
    const transaction = result.transaction;
    
    // Status IDs:
    // 131 = Pending Origination (ACH)
    // 132 = Originating (ACH)
    // 133 = Originated (ACH)
    // 134 = Settled (ACH)
    // 301 = Declined
    
    const isSuccess = transaction.status_id === 131 || 
                     transaction.status_id === 132 || 
                     transaction.status_id === 133 || 
                     transaction.status_id === 134;

    if (isSuccess) {
      return res.json({
        success: true,
        message: transaction.verbiage || "ACH payment initiated successfully",
        transactionId: transaction.id,
        statusId: transaction.status_id,
        authCode: transaction.auth_code,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: transaction.verbiage || "ACH payment declined",
        error: transaction.response_message,
        errorCode: transaction.reason_code_id?.toString(),
        statusId: transaction.status_id,
      });
    }
  } catch (error) {
    console.error("FortisPay ACH Payment Error:", error);
    
    // Handle axios errors
    if (error.response) {
      console.error("FortisPay API response error:", {
        status: error.response.status,
        code: error.response.data?.code,
      });
      return res.status(502).json({
        success: false,
        error: "Payment processing failed",
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: "Internal Server Error"
    });
  }
});

// ACH/eCheck Payment Endpoint
app.post("/pay-ach", requireAuth, async (req, res) => {
  try {
    const {
      invoiceNumber,
      amount: rawAmount,
      accountType,
      routingNumber,
      accountNumber,
      nameOnAccount,
      bankName,
      address,
      city,
      state,
      zip: rawZip,
      country
    } = req.body;

    const amount = rawAmount ? parseFloat(rawAmount) : 0;
    const zip = rawZip ? String(rawZip) : "";

    // Validate required fields
    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }
    if (!routingNumber || !accountNumber || !nameOnAccount) {
      return res.status(400).json({ error: "Incomplete bank account details" });
    }

    // Create merchant authentication
    const merchantAuthenticationType = createMerchantAuthenticationType();

    // Set up bank account payment
    const bankAccount = new ApiContracts.BankAccountType();
    
    // Map account type
    let achAccountType;
    switch (accountType?.toLowerCase()) {
      case 'savings':
        achAccountType = ApiContracts.BankAccountTypeEnum.SAVINGS;
        break;
      case 'businesschecking':
        achAccountType = ApiContracts.BankAccountTypeEnum.BUSINESSCHECKING;
        break;
      default:
        achAccountType = ApiContracts.BankAccountTypeEnum.CHECKING;
    }
    
    bankAccount.setAccountType(achAccountType);
    bankAccount.setRoutingNumber(routingNumber);
    bankAccount.setAccountNumber(accountNumber);
    bankAccount.setNameOnAccount(nameOnAccount);
    if (bankName) bankAccount.setBankName(bankName);
    bankAccount.setEcheckType(ApiContracts.EcheckTypeEnum.WEB);

    const paymentType = new ApiContracts.PaymentType();
    paymentType.setBankAccount(bankAccount);

    // Create order details
    const orderDetails = new ApiContracts.OrderType();
    orderDetails.setInvoiceNumber(invoiceNumber || `ACH-${Math.floor(Math.random() * 100000)}`);
    orderDetails.setDescription("ACH Payment");

    // Set billing information
    const billTo = new ApiContracts.CustomerAddressType();
    const nameParts = nameOnAccount.split(" ");
    billTo.setFirstName(nameParts[0] || "Customer");
    billTo.setLastName(nameParts.slice(1).join(" ") || "Customer");
    if (address) billTo.setAddress(address);
    if (city) billTo.setCity(city);
    if (state) billTo.setState(state);
    if (zip) billTo.setZip(zip);
    billTo.setCountry(country || "USA");

    // Create transaction request
    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(
      ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION
    );
    transactionRequestType.setPayment(paymentType);
    transactionRequestType.setAmount(amount);
    transactionRequestType.setOrder(orderDetails);
    transactionRequestType.setBillTo(billTo);

    // Create request
    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequestType);
    createRequest.setRefId(Math.floor(Math.random() * 1000000).toString());

    // Execute request
    const ctrl = new ApiControllers.CreateTransactionController(
      createRequest.getJSON()
    );
    ctrl.setEnvironment(ENVIRONMENT);

    await ctrl.execute(function () {
      try {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.CreateTransactionResponse(apiResponse);

        if (!response) {
          return res.status(500).json({ error: "Invalid response from payment gateway" });
        }

        if (
          response.getMessages() &&
          response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK
        ) {
          const transactionResponse = response.getTransactionResponse();

          if (transactionResponse && transactionResponse.getResponseCode() === "1") {
            return res.json({
              success: true,
              message: "ACH Transaction Initiated!",
              transactionId: transactionResponse.getTransId(),
            });
          } else {
            let errorMessage = "ACH Transaction Declined";
            if (transactionResponse?.getErrors()?.getError()) {
              const errors = transactionResponse.getErrors().getError();
              if (errors.length > 0) {
                errorMessage = errors[0].getErrorText();
              }
            }
            return res.status(400).json({
              success: false,
              message: "ACH Transaction Declined",
              error: errorMessage,
            });
          }
        } else {
          let errorMessage = "ACH Transaction Failed";
          let errorCode = "";
          if (response.getMessages()?.getMessage()) {
            const messages = response.getMessages().getMessage();
            if (messages.length > 0) {
              errorMessage = messages[0].getText();
              errorCode = messages[0].getCode();
            }
          }
          return res.status(400).json({
            success: false,
            message: "ACH Transaction Failed",
            error: errorMessage,
            errorCode: errorCode,
          });
        }
      } catch (error) {
        console.error("Error processing ACH response:", error);
        return res.status(500).json({
          error: "Error processing ACH payment response",
        });
      }
    });
  } catch (error) {
    console.error("ACH Payment Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Test Authorize.net Connection
app.post("/test-authorize", requireAdmin, async (req, res) => {
  try {
    const { apiLoginId, transactionKey, testMode } = req.body;

    if (!apiLoginId || !transactionKey) {
      return res.status(400).json({ 
        success: false, 
        message: "API Login ID and Transaction Key are required" 
      });
    }

    // Create merchant authentication with provided credentials
    const merchantAuth = new ApiContracts.MerchantAuthenticationType();
    merchantAuth.setName(apiLoginId);
    merchantAuth.setTransactionKey(transactionKey);

    // Use getMerchantDetails to test credentials
    const getRequest = new ApiContracts.GetMerchantDetailsRequest();
    getRequest.setMerchantAuthentication(merchantAuth);

    const ctrl = new ApiControllers.GetMerchantDetailsController(getRequest.getJSON());
    
    // Set environment based on testMode
    const environment = testMode 
      ? SDKConstants.endpoint.sandbox 
      : SDKConstants.endpoint.production;
    ctrl.setEnvironment(environment);

    await ctrl.execute(function () {
      try {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.GetMerchantDetailsResponse(apiResponse);

        if (
          response.getMessages() &&
          response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK
        ) {
          return res.json({
            success: true,
            message: "Connection successful",
            merchantName: response.getMerchantName ? response.getMerchantName() : null,
          });
        } else {
          let errorMessage = "Connection failed";
          if (response.getMessages()?.getMessage()) {
            const messages = response.getMessages().getMessage();
            if (messages.length > 0) {
              errorMessage = messages[0].getText();
            }
          }
          return res.status(400).json({
            success: false,
            message: errorMessage,
          });
        }
      } catch (error) {
        console.error("Error testing connection:", error);
        return res.status(500).json({
          success: false,
          message: "Error testing connection",
        });
      }
    });
  } catch (error) {
    console.error("Test Connection Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal Server Error"
    });
  }
});

// ============================================
// PAY-NOW ENDPOINTS (Unauthenticated - for payment links sent via email)
// These bypass RLS by using supabaseAdmin (service role)
// ============================================

const normalizePointsPerDollar = (value) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 1;
  return Math.floor(numericValue);
};

async function awardPayNowOrderPoints({ order, orderId, orderTotal, newPaymentStatus }) {
  try {
    const previousStatus = String(order?.payment_status || "").toLowerCase();
    const wasUnpaidOrPending =
      previousStatus === "unpaid" ||
      previousStatus === "pending" ||
      previousStatus === "partial_paid";
    const paymentMethod = String(order?.payment_method || "").toLowerCase();

    if (newPaymentStatus !== "paid" || !wasUnpaidOrPending || paymentMethod === "credit") {
      return;
    }

    const rewardUserId = order?.profile_id || order?.location_id || order?.customer;
    if (!rewardUserId || !(Number(orderTotal) > 0)) {
      console.log(`[pay-now] Reward points skipped for order ${orderId}: missing user or invalid total`);
      return;
    }

    // Prevent duplicate awards for the same order.
    const { data: existingRewardTx, error: rewardCheckError } = await supabaseAdmin
      .from("reward_transactions")
      .select("id")
      .eq("reference_id", orderId)
      .eq("reference_type", "order")
      .eq("transaction_type", "earn")
      .maybeSingle();

    if (rewardCheckError) {
      console.error(`[pay-now] Failed reward duplicate-check for order ${orderId}:`, rewardCheckError);
      return;
    }
    if (existingRewardTx) {
      console.log(`[pay-now] Reward points already awarded for order ${orderId}, skipping`);
      return;
    }

    const { data: rewardsConfig, error: configError } = await supabaseAdmin
      .from("rewards_config")
      .select("program_enabled, points_per_dollar")
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error(`[pay-now] Failed to load rewards config for order ${orderId}:`, configError);
      return;
    }
    if (!rewardsConfig?.program_enabled) {
      console.log(`[pay-now] Rewards program disabled; skipping points for order ${orderId}`);
      return;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, type, reward_points, lifetime_reward_points, reward_tier")
      .eq("id", rewardUserId)
      .maybeSingle();

    if (profileError || !profile) {
      console.error(`[pay-now] Failed to load reward profile ${rewardUserId} for order ${orderId}:`, profileError);
      return;
    }
    if (String(profile.type || "").toLowerCase() === "group") {
      console.log(`[pay-now] Group profile ${rewardUserId}; reward points skipped for order ${orderId}`);
      return;
    }

    const { data: tiers, error: tiersError } = await supabaseAdmin
      .from("reward_tiers")
      .select("name, min_points, multiplier")
      .order("min_points", { ascending: true });

    const currentPoints = Number(profile.reward_points || 0);
    let tierMultiplier = 1;
    let newTierName = profile.reward_tier || "Bronze";

    if (!tiersError && Array.isArray(tiers) && tiers.length > 0) {
      let currentTier = tiers[0];
      for (const tier of tiers) {
        if (currentPoints >= Number(tier.min_points || 0)) {
          currentTier = tier;
        }
      }

      const currentMultiplier = Number(currentTier.multiplier || 1);
      if (Number.isFinite(currentMultiplier) && currentMultiplier > 0) {
        tierMultiplier = currentMultiplier;
      }
    } else if (tiersError) {
      console.error(`[pay-now] Failed to load reward tiers for order ${orderId}:`, tiersError);
    }

    const pointsPerDollar = normalizePointsPerDollar(rewardsConfig.points_per_dollar);
    const pointsEarned = Math.floor(Number(orderTotal) * pointsPerDollar * tierMultiplier);

    if (!(pointsEarned > 0)) {
      console.log(`[pay-now] Calculated 0 reward points for order ${orderId}, skipping`);
      return;
    }

    const newPointsTotal = currentPoints + pointsEarned;
    if (Array.isArray(tiers) && tiers.length > 0) {
      let resolvedTier = tiers[0];
      for (const tier of tiers) {
        if (newPointsTotal >= Number(tier.min_points || 0)) {
          resolvedTier = tier;
        }
      }
      if (resolvedTier?.name) {
        newTierName = resolvedTier.name;
      }
    }

    const newLifetimeTotal = Number(profile.lifetime_reward_points || 0) + pointsEarned;

    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({
        reward_points: newPointsTotal,
        lifetime_reward_points: newLifetimeTotal,
        reward_tier: newTierName,
      })
      .eq("id", rewardUserId);

    if (updateProfileError) {
      console.error(`[pay-now] Failed to update reward points for user ${rewardUserId}:`, updateProfileError);
      return;
    }

    const { error: insertRewardTxError } = await supabaseAdmin
      .from("reward_transactions")
      .insert({
        user_id: rewardUserId,
        points: pointsEarned,
        transaction_type: "earn",
        description: `Earned from order #${order.order_number || orderId}`,
        reference_type: "order",
        reference_id: orderId,
      });

    if (insertRewardTxError) {
      console.error(`[pay-now] Failed to insert reward transaction for order ${orderId}:`, insertRewardTxError);
      return;
    }

    console.log(
      `[pay-now] Reward points awarded for order ${order.order_number || orderId}: +${pointsEarned} points to ${rewardUserId}`
    );
  } catch (rewardError) {
    console.error(`[pay-now] Unexpected reward points error for order ${orderId}:`, rewardError);
  }
}

const isPurchaseOrder = (order = {}) =>
  String(order?.order_type || "").toLowerCase() === "purchase_order" ||
  String(order?.order_number || "").toUpperCase().startsWith("PO-");

async function hasOrderBatchDeductions(orderId) {
  const { count, error } = await supabaseAdmin
    .from("batch_transactions")
    .select("id", { head: true, count: "exact" })
    .eq("reference_id", orderId)
    .eq("reference_type", "order")
    .eq("transaction_type", "sale");

  if (error) {
    throw error;
  }

  return (count || 0) > 0;
}

async function hasPayNowStockDeductionMarker(orderId) {
  const { data, error } = await supabaseAdmin
    .from("order_activities")
    .select("id")
    .eq("order_id", orderId)
    .eq("activity_type", "updated")
    .contains("metadata", {
      stock_deducted_after_payment: true,
      source: "pay_now_link",
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return !!data;
}

async function markPayNowStockDeducted(order) {
  if (!order?.id) return;

  await supabaseAdmin.from("order_activities").insert({
    order_id: order.id,
    activity_type: "updated",
    description: "Stock deducted after successful payment",
    performed_by_name: order.customerInfo?.name || "System",
    performed_by_email: order.customerInfo?.email || null,
    metadata: {
      order_number: order.order_number,
      stock_deducted_after_payment: true,
      source: "pay_now_link",
    },
  });
}

async function hasDeferredOrderEditInventoryDeduction(orderId) {
  const { data, error } = await supabaseAdmin
    .from("order_activities")
    .select("metadata")
    .eq("order_id", orderId)
    .eq("activity_type", "updated")
    .contains("metadata", {
      source: "order_edit_inventory_rpc",
      inventory_changed: true,
    })
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw error;
  }

  return (data || []).some((row) => {
    const action = row?.metadata?.adjustment_action;
    return action === "none" || action === "send_payment_link";
  });
}

async function deductQuickOrderStockAfterPayment(order) {
  if (!order?.id) {
    return;
  }

  const alreadyMarked = await hasPayNowStockDeductionMarker(order.id);
  if (alreadyMarked) {
    console.log(`[pay-now] Stock already deducted for order ${order.order_number || order.id}, skipping`);
    return;
  }

  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length === 0) {
    await markPayNowStockDeducted(order);
    return;
  }

  const batchManagedUnitsBySize = new Map();
  const fallbackCasesBySize = new Map();
  let batchDeductionAlreadyExists = false;

  try {
    batchDeductionAlreadyExists = await hasOrderBatchDeductions(order.id);
  } catch (batchCheckError) {
    console.warn(`[pay-now] Unable to check existing batch deductions for order ${order.id}:`, batchCheckError);
  }

  if (!batchDeductionAlreadyExists) {
    for (const item of items) {
      for (const size of item?.sizes || []) {
        const sizeId = size?.id;
        const caseQty = Number(size?.quantity || 0);
        if (!sizeId || !(caseQty > 0)) continue;

        const quantityPerCase = Math.max(1, Number(size?.quantity_per_case || 1));
        const requestedUnits = caseQty * quantityPerCase;

        try {
          const { data: availableBatches, error: batchFetchError } = await supabaseAdmin
            .from("product_batches")
            .select("id, lot_number, quantity_available")
            .eq("product_size_id", sizeId)
            .eq("status", "active")
            .gt("quantity_available", 0)
            .order("expiry_date", { ascending: true, nullsFirst: false })
            .order("received_date", { ascending: true });

          if (batchFetchError) {
            throw batchFetchError;
          }

          if (!availableBatches || availableBatches.length === 0) {
            const fallbackCases = Number(fallbackCasesBySize.get(sizeId) || 0) + caseQty;
            fallbackCasesBySize.set(sizeId, fallbackCases);
            continue;
          }

          let remaining = requestedUnits;
          const allocations = [];

          for (const batch of availableBatches) {
            if (remaining <= 0) break;
            const availableQty = Number(batch.quantity_available || 0);
            const allocateQty = Math.min(availableQty, remaining);
            if (allocateQty <= 0) continue;

            allocations.push({
              batch_id: batch.id,
              lot_number: batch.lot_number,
              quantity: allocateQty,
            });
            remaining -= allocateQty;
          }

          if (allocations.length === 0) {
            const fallbackCases = Number(fallbackCasesBySize.get(sizeId) || 0) + caseQty;
            fallbackCasesBySize.set(sizeId, fallbackCases);
            continue;
          }

          if (remaining > 0) {
            throw new Error(`Insufficient batch stock. Missing ${remaining} units`);
          }

          for (const allocation of allocations) {
            const { error: batchDeductError } = await supabaseAdmin.rpc("deduct_batch_quantity", {
              p_batch_id: allocation.batch_id,
              p_quantity: allocation.quantity,
            });

            if (batchDeductError) {
              const { data: batchData, error: batchRowFetchError } = await supabaseAdmin
                .from("product_batches")
                .select("quantity_available")
                .eq("id", allocation.batch_id)
                .single();

              if (batchRowFetchError) throw batchRowFetchError;

              const newQuantityAvailable = Math.max(
                0,
                Number(batchData?.quantity_available || 0) - allocation.quantity
              );

              const { error: batchRowUpdateError } = await supabaseAdmin
                .from("product_batches")
                .update({
                  quantity_available: newQuantityAvailable,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", allocation.batch_id);

              if (batchRowUpdateError) throw batchRowUpdateError;
            }

            const { error: txError } = await supabaseAdmin
              .from("batch_transactions")
              .insert({
                batch_id: allocation.batch_id,
                transaction_type: "sale",
                quantity: allocation.quantity,
                reference_id: order.id,
                reference_type: "order",
                notes: `Pay-now sale from lot ${allocation.lot_number || ""}`.trim(),
              });

            if (txError) throw txError;
          }

          const previouslyDeducted = Number(batchManagedUnitsBySize.get(sizeId) || 0);
          const totalAllocatedUnits = allocations.reduce(
            (sum, allocation) => sum + Number(allocation.quantity || 0),
            0
          );
          batchManagedUnitsBySize.set(sizeId, previouslyDeducted + totalAllocatedUnits);
        } catch (batchError) {
          throw new Error(`[pay-now] Batch deduction failed for size ${sizeId}: ${batchError?.message || batchError}`);
        }
      }
    }
  } else {
    // Batch already deducted previously: avoid double stock decrement.
    console.log(`[pay-now] Batch stock already deducted for order ${order.order_number || order.id}, skipping duplicate stock update`);
    await markPayNowStockDeducted(order);
    return;
  }

  // Apply a single product_sizes stock update per size:
  // - batch-managed sizes use allocated units
  // - non-batch sizes fallback to case quantity
  const stockReductionBySize = new Map(batchManagedUnitsBySize);
  for (const [sizeId, fallbackCases] of fallbackCasesBySize.entries()) {
    if (!stockReductionBySize.has(sizeId)) {
      stockReductionBySize.set(sizeId, fallbackCases);
    }
  }

  for (const [sizeId, reductionQty] of stockReductionBySize.entries()) {
    if (!(Number(reductionQty) > 0)) continue;

    const { data: currentSize, error: sizeFetchError } = await supabaseAdmin
      .from("product_sizes")
      .select("stock")
      .eq("id", sizeId)
      .single();

    if (sizeFetchError || !currentSize) {
      throw new Error(`[pay-now] Failed to fetch stock for size ${sizeId}`);
    }

    const newQuantity = Math.max(0, Number(currentSize.stock || 0) - Number(reductionQty));
    const { error: sizeUpdateError } = await supabaseAdmin
      .from("product_sizes")
      .update({
        stock: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sizeId);

    if (sizeUpdateError) {
      throw new Error(`[pay-now] Failed to update stock for size ${sizeId}`);
    }
  }

  await markPayNowStockDeducted(order);
  console.log(`[pay-now] Stock deduction completed for order ${order.order_number || order.id}`);
}

// Dedicated limiter for pay-now endpoints (kept separate from general/email counters).
// Use env values so QA/testing can increase without code edits.
const payNowLimiter = createRateLimiter(
  parseInt(process.env.PAY_NOW_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  parseInt(process.env.PAY_NOW_RATE_LIMIT_MAX_REQUESTS) || 60,
  "pay_now"
);

// GET order details for pay-now page (unauthenticated)
app.get("/api/pay-now-order/:orderId", payNowLimiter, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const { orderId } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!orderId || !uuidRegex.test(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching order for pay-now:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch order" });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // Return only necessary fields (don't expose internal data)
    return res.json({
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        items: order.items,
        customerInfo: order.customerInfo,
        shippingAddress: order.shippingAddress,
        shipping_cost: order.shipping_cost,
        tax_amount: order.tax_amount,
        discount_amount: order.discount_amount,
        discount_details: order.discount_details,
        total_amount: order.total_amount,
        paid_amount: order.paid_amount,
        payment_status: order.payment_status,
        poAccept: order.poAccept,
        po_handling_charges: order.po_handling_charges,
        po_fred_charges: order.po_fred_charges,
        estimated_delivery: order.estimated_delivery,
       processing_fee_amount: order.processing_fee_amount,
        notes: order.notes,
        profile_id: order.profile_id,
        customer: order.customer,
        order_type: order.order_type,
        purchase_number_external: order.purchase_number_external,
        payment_method: order.payment_method,
      }
    });
  } catch (error) {
    console.error("Pay-now order fetch error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// POST process payment for pay-now (unauthenticated - full server-side flow)
app.post("/api/pay-now-process", payNowLimiter, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ success: false, message: "Server configuration error" });
    }

    const {
      orderId,
      cardNumber,
      expirationDate,
      cvv,
      cardholderName,
      address,
      city,
      state,
      zip,
      country,
      paymentType, // "credit_card" or "ach"
      saveCard,
      // ACH fields
      accountType,
      routingNumber,
      accountNumber,
      nameOnAccount,
    } = req.body;

    // 1. Validate orderId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!orderId || !uuidRegex.test(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order ID" });
    }

    // 2. Validate payment fields
    if (paymentType === "credit_card") {
      if (!cardNumber || !expirationDate || !cvv || !cardholderName) {
        return res.status(400).json({ success: false, message: "Incomplete credit card details" });
      }
    } else if (paymentType === "ach") {
      if (!routingNumber || !accountNumber || !nameOnAccount) {
        return res.status(400).json({ success: false, message: "Incomplete bank account details" });
      }
    } else {
      return res.status(400).json({ success: false, message: "Invalid payment type" });
    }

    // 3. Fetch the REAL order from DB (server-side, bypasses RLS)
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError || !order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // 4. Check if order is already fully paid
    if (order.payment_status === "paid") {
      return res.status(400).json({ success: false, message: "This order is already paid" });
    }

    // 5. Calculate the REAL amount from DB (never trust frontend amount)
    console.log(`[pay-now] ========== PAYMENT CALCULATION START ==========`);
    console.log(`[pay-now] Order: ${order.order_number} (${orderId})`);
    
    const itemsSubtotal = order.items?.reduce((total, item) => {
      return total + (item.sizes?.reduce((sum, size) => sum + size.quantity * size.price, 0) || 0);
    }, 0) || 0;

    const shippingCost = parseFloat(order.shipping_cost || "0");
    const taxAmount = parseFloat(order.tax_amount?.toString() || "0");
    const discountAmount = parseFloat(order.discount_amount?.toString() || "0");
    const isPurchaseOrderPricing = order.poAccept === false;
    const handlingCharges = isPurchaseOrderPricing ? parseFloat(order.po_handling_charges || "0") : 0;
    const fredCharges = isPurchaseOrderPricing ? parseFloat(order.po_fred_charges || "0") : 0;
    const existingProcessingFee = parseFloat(order.processing_fee_amount?.toString() || "0");
    const paidAmount = Number(order.paid_amount || 0);

    console.log(`[pay-now] Order breakdown:`);
    console.log(`  - Items subtotal: $${itemsSubtotal.toFixed(2)}`);
    console.log(`  - Shipping: $${shippingCost.toFixed(2)}`);
    console.log(`  - Tax: $${taxAmount.toFixed(2)}`);
    console.log(`  - Handling: $${handlingCharges.toFixed(2)}`);
    console.log(`  - Freight: $${fredCharges.toFixed(2)}`);
    console.log(`  - Discount: -$${discountAmount.toFixed(2)}`);
    console.log(`  - Existing processing fee: $${existingProcessingFee.toFixed(2)}`);
    console.log(`  - Already paid: $${paidAmount.toFixed(2)}`);

    // Calculate total WITHOUT processing fee first (base amount)
    const baseTotal = itemsSubtotal + shippingCost + taxAmount + handlingCharges + fredCharges - discountAmount;
    
    // Current total includes existing processing fee
    const currentTotal = baseTotal + existingProcessingFee;
    
    // Balance due on the CURRENT total (includes old processing fee)
    const currentBalanceDue = Math.abs(currentTotal - paidAmount) < 0.01 ? 0 : Math.max(0, currentTotal - paidAmount);

    console.log(`  - Base total (no fees): $${baseTotal.toFixed(2)}`);
    console.log(`  - Current total (with old fee): $${currentTotal.toFixed(2)}`);
    console.log(`  - Current balance due: $${currentBalanceDue.toFixed(2)}`);

    if (currentBalanceDue <= 0) {
      console.log(`[pay-now] ❌ No balance due - order already paid`);
      return res.status(400).json({ success: false, message: "No balance due on this order" });
    }

    // Calculate what portion of balance is base amount vs old processing fee
    // If balance < existingProcessingFee, customer is paying remaining fee only
    // Otherwise, customer is paying base amount + potentially new fee
    const balanceOfOldFee = Math.min(currentBalanceDue, existingProcessingFee);
    const balanceOfBaseAmount = currentBalanceDue - balanceOfOldFee;

    console.log(`  - Balance breakdown:`);
    console.log(`    * Base amount portion: $${balanceOfBaseAmount.toFixed(2)}`);
    console.log(`    * Old fee portion: $${balanceOfOldFee.toFixed(2)}`);

    // Get processing fee settings - fetch from admin/superadmin profile
    console.log(`[pay-now] Fetching processing fee settings...`);
    
    // First, try to get settings from the first admin/superadmin profile
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .in("role", ["admin", "superadmin"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (adminProfileError) {
      console.error(`[pay-now] ❌ Error fetching admin profile:`, adminProfileError);
    } else if (adminProfile) {
      console.log(`[pay-now] Found admin profile: ${adminProfile.id}`);
    } else {
      console.log(`[pay-now] ⚠️  No admin profile found`);
    }

    // Fetch settings for admin profile
    const { data: uiSettings, error: uiSettingsError } = await supabaseAdmin
      .from("settings")
      .select("card_processing_fee_enabled, card_processing_fee_percentage, card_processing_fee_pass_to_customer, profile_id")
      .eq("profile_id", adminProfile?.id)
      .maybeSingle();

    console.log(`[pay-now] Processing fee settings query result:`);
    if (uiSettingsError) {
      console.error(`  - ❌ Error fetching settings:`, uiSettingsError);
    } else if (!uiSettings) {
      console.log(`  - ⚠️  No settings found for admin profile ${adminProfile?.id}`);
    } else {
      console.log(`  - ✅ Settings found for profile: ${uiSettings.profile_id}`);
      console.log(`  - Raw settings:`, JSON.stringify(uiSettings, null, 2));
    }

    const cardFeeEnabled =
      paymentType === "credit_card" &&
      Boolean(uiSettings?.card_processing_fee_enabled) &&
      Boolean(uiSettings?.card_processing_fee_pass_to_customer);
    const configuredCardFeePercent = Number(uiSettings?.card_processing_fee_percentage || 0);
    
    console.log(`[pay-now] Processing fee calculation:`);
    console.log(`  - Payment type: ${paymentType}`);
    console.log(`  - card_processing_fee_enabled: ${uiSettings?.card_processing_fee_enabled} (type: ${typeof uiSettings?.card_processing_fee_enabled})`);
    console.log(`  - card_processing_fee_pass_to_customer: ${uiSettings?.card_processing_fee_pass_to_customer} (type: ${typeof uiSettings?.card_processing_fee_pass_to_customer})`);
    console.log(`  - card_processing_fee_percentage: ${uiSettings?.card_processing_fee_percentage} (type: ${typeof uiSettings?.card_processing_fee_percentage})`);
    console.log(`  - ✅ Final cardFeeEnabled: ${cardFeeEnabled}`);
    console.log(`  - ✅ Final configuredCardFeePercent: ${configuredCardFeePercent}%`);

    // Calculate NEW processing fee on the ENTIRE balance due
    // This ensures processing fee is charged on every payment, including balance payments
    const newProcessingFeeAmount = cardFeeEnabled
      ? Number(((currentBalanceDue * configuredCardFeePercent) / 100).toFixed(2))
      : 0;

    // Amount to apply = balance due
    const amountApplied = parseFloat(currentBalanceDue.toFixed(2));
    
    // Total amount to charge = balance + new processing fee
    const amountToCharge = parseFloat((amountApplied + newProcessingFeeAmount).toFixed(2));

    console.log(`[pay-now] Payment calculation:`);
    console.log(`  - Amount applied (balance): $${amountApplied.toFixed(2)}`);
    console.log(`  - NEW processing fee (${configuredCardFeePercent}% of balance): $${newProcessingFeeAmount.toFixed(2)}`);
    console.log(`  - Total to charge customer: $${amountToCharge.toFixed(2)}`);
    console.log(`[pay-now] ========== PAYMENT CALCULATION END ==========`);

    // Store for later use
    const processingFeeAmount = newProcessingFeeAmount;

    console.log(`[pay-now] Processing payment for order ${order.order_number}, amount: $${amountToCharge}`);

    // 6. Fetch Authorize.Net credentials from payment_settings table (same source as Edge Function)
    const { data: paymentSettingsData, error: settingsError } = await supabaseAdmin
      .from("payment_settings")
      .select("*")
      .eq("provider", "authorize_net")
      .limit(1)
      .maybeSingle();

    if (settingsError || !paymentSettingsData) {
      console.error("[pay-now] Payment settings not found:", settingsError);
      return res.status(500).json({ success: false, message: "Payment gateway not configured" });
    }

    const settings = paymentSettingsData.settings;
    if (!settings || !settings.enabled) {
      return res.status(400).json({ success: false, message: "Payment gateway is disabled" });
    }

    const DB_API_LOGIN_ID = (settings.apiLoginId || "").toString().trim();
    const DB_TRANSACTION_KEY = (settings.transactionKey || "").toString().trim();
    const IS_TEST_MODE = settings.testMode === true;

    if (!DB_API_LOGIN_ID || !DB_TRANSACTION_KEY) {
      return res.status(500).json({ success: false, message: "Payment gateway credentials not configured" });
    }

    // Use credentials from DB
    const payNowMerchantAuth = new ApiContracts.MerchantAuthenticationType();
    payNowMerchantAuth.setName(DB_API_LOGIN_ID);
    payNowMerchantAuth.setTransactionKey(DB_TRANSACTION_KEY);

    // Use correct environment based on DB settings
    const payNowEnvironment = IS_TEST_MODE
      ? SDKConstants.endpoint.sandbox
      : SDKConstants.endpoint.production;

    let paymentTypeObj;
    if (paymentType === "credit_card") {
      const creditCard = new ApiContracts.CreditCardType();
      creditCard.setCardNumber(cardNumber.toString().replace(/\s/g, ""));
      creditCard.setExpirationDate(expirationDate.toString().replace("/", ""));
      creditCard.setCardCode(cvv.toString());
      paymentTypeObj = new ApiContracts.PaymentType();
      paymentTypeObj.setCreditCard(creditCard);
    } else {
      // ACH
      const bankAccount = new ApiContracts.BankAccountType();
      bankAccount.setAccountType(accountType === "savings"
        ? ApiContracts.BankAccountTypeEnum.SAVINGS
        : ApiContracts.BankAccountTypeEnum.CHECKING);
      bankAccount.setRoutingNumber(routingNumber.toString());
      bankAccount.setAccountNumber(accountNumber.toString());
      bankAccount.setNameOnAccount(nameOnAccount);
      bankAccount.setEcheckType(ApiContracts.EcheckTypeEnum.WEB);
      paymentTypeObj = new ApiContracts.PaymentType();
      paymentTypeObj.setBankAccount(bankAccount);
    }

    // Order details
    const orderDetails = new ApiContracts.OrderType();
    orderDetails.setInvoiceNumber(order.order_number || `9RX${Date.now().toString().slice(-8)}`);
    orderDetails.setDescription(`Payment for order ${order.order_number}`);

    // Billing info
    const billTo = new ApiContracts.CustomerAddressType();
    const nameForBilling = paymentType === "credit_card" ? cardholderName : nameOnAccount;
    const nameParts = (nameForBilling || "Customer").split(" ");
    billTo.setFirstName(nameParts[0] || "Customer");
    billTo.setLastName(nameParts.length > 1 ? nameParts.slice(1).join(" ") : "Customer");
    billTo.setAddress(address || "");
    billTo.setCity(city || "");
    billTo.setState(state || "");
    billTo.setZip(zip ? parseInt(zip, 10) : 0);
    billTo.setCountry(country || "USA");

    // Transaction request
    const transactionRequestType = new ApiContracts.TransactionRequestType();
    transactionRequestType.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequestType.setPayment(paymentTypeObj);
    transactionRequestType.setAmount(amountToCharge);
    transactionRequestType.setOrder(orderDetails);
    transactionRequestType.setBillTo(billTo);

    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(payNowMerchantAuth);
    createRequest.setTransactionRequest(transactionRequestType);
    createRequest.setRefId(Math.floor(Math.random() * 1000000).toString());

    const ctrl = new ApiControllers.CreateTransactionController(createRequest.getJSON());
    ctrl.setEnvironment(payNowEnvironment);

    await ctrl.execute(async function () {
      try {
        const apiResponse = ctrl.getResponse();
        const response = new ApiContracts.CreateTransactionResponse(apiResponse);

        if (!response) {
          return res.status(500).json({ success: false, message: "Invalid response from payment gateway" });
        }

        let paymentSuccess = false;
        let transactionId = null;
        let authCode = null;
        let errorMessage = "Transaction Failed";
        let errorCode = null;

        if (
          response.getMessages() &&
          response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK
        ) {
          const transactionResponse = response.getTransactionResponse();
          if (transactionResponse && transactionResponse.getResponseCode() === "1") {
            paymentSuccess = true;
            transactionId = transactionResponse.getTransId();
            authCode = transactionResponse.getAuthCode ? transactionResponse.getAuthCode() : null;
          } else {
            if (transactionResponse?.getErrors?.()?.getError?.()) {
              const errors = transactionResponse.getErrors().getError();
              if (errors.length > 0) errorMessage = errors[0].getErrorText();
            }
          }
        } else {
          if (response.getMessages()?.getMessage?.()) {
            const messages = response.getMessages().getMessage();
            if (messages.length > 0) {
              errorMessage = messages[0].getText();
              errorCode = messages[0].code;
            }
          }
        }

        // 7. If payment failed, return error (don't update DB)
        if (!paymentSuccess) {
          // Log failed transaction
          const profileId = order.profile_id || order.customer;
          if (profileId) {
            try {
              await supabaseAdmin.from("payment_transactions").insert({
                profile_id: profileId,
                order_id: orderId,
                transaction_type: "auth_capture",
                amount: amountToCharge,
                payment_method_type: paymentType === "credit_card" ? "card" : "ach",
                card_last_four: paymentType === "credit_card" ? cardNumber.slice(-4) : null,
                status: "declined",
                response_message: errorMessage,
                error_code: errorCode,
                error_message: errorMessage,
              });
            } catch (logErr) {
              console.error("Failed to log declined transaction:", logErr);
            }
          }

          return res.status(400).json({
            success: false,
            message: errorMessage,
            errorCode: errorCode,
          });
        }

        // 8. Payment succeeded — update all DB records using supabaseAdmin
        console.log(`[pay-now] ========== PAYMENT SUCCESS - UPDATING DATABASE ==========`);
        console.log(`[pay-now] Transaction ID: ${transactionId}, Auth Code: ${authCode}`);
        console.log(`[pay-now] Order: ${order.order_number}`);
        
        // Current state
        console.log(`[pay-now] BEFORE update:`);
        console.log(`  - Current total_amount in DB: $${currentTotal.toFixed(2)}`);
        console.log(`  - Current paid_amount in DB: $${paidAmount.toFixed(2)}`);
        console.log(`  - Current processing_fee_amount in DB: $${existingProcessingFee.toFixed(2)}`);
        console.log(`  - Current payment_status: ${order.payment_status}`);

        // Calculate new amounts
        console.log(`[pay-now] THIS payment:`);
        console.log(`  - Amount applied to balance: $${amountApplied.toFixed(2)}`);
        console.log(`  - NEW processing fee charged: $${processingFeeAmount.toFixed(2)}`);
        console.log(`  - Total charged to customer: $${amountToCharge.toFixed(2)}`);

        // New totals
        const newPaidAmount = paidAmount + amountToCharge; // Total customer has paid (includes all fees)
        const totalProcessingFee = existingProcessingFee + processingFeeAmount; // All fees accumulated
        const newTotalAmount = baseTotal + totalProcessingFee; // Base + all accumulated fees
        
        console.log(`[pay-now] AFTER update (calculated):`);
        console.log(`  - NEW total_amount: $${newTotalAmount.toFixed(2)} (base $${baseTotal.toFixed(2)} + fees $${totalProcessingFee.toFixed(2)})`);
        console.log(`  - NEW paid_amount: $${newPaidAmount.toFixed(2)}`);
        console.log(`  - NEW processing_fee_amount: $${totalProcessingFee.toFixed(2)}`);
        
        const previousPaymentStatus = String(order.payment_status || "").toLowerCase();
        const wasUnpaidOrPending =
          previousPaymentStatus === "unpaid" ||
          previousPaymentStatus === "pending" ||
          previousPaymentStatus === "partial_paid";
        let deferredEditInventoryAlreadyDeducted = false;
        if (previousPaymentStatus === "partial_paid") {
          try {
            deferredEditInventoryAlreadyDeducted = await hasDeferredOrderEditInventoryDeduction(orderId);
          } catch (deferredCheckError) {
            console.error(
              `[pay-now] Failed to check deferred order-edit inventory marker for order ${orderId}:`,
              deferredCheckError
            );
          }
        }
        
        // Determine new payment status
        const remainingBalance = newTotalAmount - newPaidAmount;
        const newPaymentStatus = Math.abs(remainingBalance) < 0.01 ? "paid" : "partial_paid";

        console.log(`  - Remaining balance: $${remainingBalance.toFixed(2)}`);
        console.log(`  - NEW payment_status: ${newPaymentStatus}`);
        console.log(`[pay-now] ========== UPDATING ORDER TABLE ==========`);

        // 8a. Update order with all amounts
        const orderUpdateResult = await supabaseAdmin.from("orders").update({
          payment_status: newPaymentStatus,
          paid_amount: newPaidAmount,
          total_amount: newTotalAmount,
          processing_fee_amount: totalProcessingFee,
          updated_at: new Date().toISOString(),
        }).eq("id", orderId);

        if (orderUpdateResult.error) {
          console.error(`[pay-now] ❌ Failed to update order:`, orderUpdateResult.error);
          throw orderUpdateResult.error;
        }
        
        console.log(`[pay-now] ✅ Order updated successfully`);

        // Only consider pending order-edit delta adjustments when stock was already
        // deducted previously. For unpaid/pending/partial -> paid transitions, stock
        // must be deducted from the full current order payload, not just delta.
        let pendingInventoryAdjustmentApplied = false;
        if (
          previousPaymentStatus === "paid" ||
          (previousPaymentStatus === "partial_paid" && deferredEditInventoryAlreadyDeducted)
        ) {
          try {
            const { data: pendingAdjustResult, error: pendingAdjustError } = await supabaseAdmin.rpc(
              "apply_pending_order_edit_inventory_adjustment_atomic",
              { p_order_id: orderId }
            );

            if (pendingAdjustError) {
              console.error(`[pay-now] Failed to apply pending inventory adjustment for order ${orderId}:`, pendingAdjustError);
            } else if (
              pendingAdjustResult?.status === "applied" ||
              pendingAdjustResult?.status === "already_processed"
            ) {
              pendingInventoryAdjustmentApplied = true;
              console.log(
                `[pay-now] Pending inventory adjustment handled (${pendingAdjustResult?.status}) for order ${order.order_number || orderId}`
              );
            }
          } catch (pendingAdjustUnhandledError) {
            console.error(`[pay-now] Unexpected pending inventory adjustment error for order ${orderId}:`, pendingAdjustUnhandledError);
          }
        }

        // Pay-now stock deduction must happen only after successful payment.
        if (
          newPaymentStatus === "paid" &&
          wasUnpaidOrPending &&
          !isPurchaseOrder(order) &&
          !pendingInventoryAdjustmentApplied &&
          !deferredEditInventoryAlreadyDeducted
        ) {
          try {
            await deductQuickOrderStockAfterPayment(order);
          } catch (stockError) {
            console.error(`[pay-now] Stock deduction failed for order ${orderId}:`, stockError);
          }
        } else if (deferredEditInventoryAlreadyDeducted) {
          console.log(
            `[pay-now] Skipping full-order stock deduction for ${order.order_number || orderId}; deferred edit inventory was already deducted`
          );
        }

        // Keep pay-now reward behavior aligned with other paid flows.
        await awardPayNowOrderPoints({
          order,
          orderId,
          orderTotal: newTotalAmount,
          newPaymentStatus,
        });

        // 8b. Log payment transaction
        const profileId = order.profile_id || order.customer;
        if (profileId) {
          try {
            await supabaseAdmin.from("payment_transactions").insert({
              profile_id: profileId,
              order_id: orderId,
              transaction_id: transactionId,
              auth_code: authCode,
              transaction_type: "auth_capture",
              amount: amountToCharge,
              payment_method_type: paymentType === "credit_card" ? "card" : "ach",
              card_last_four: paymentType === "credit_card" ? cardNumber.slice(-4) : null,
              status: "approved",
              response_message: "Transaction Approved",
            });
          } catch (logErr) {
            console.error("Failed to log approved transaction:", logErr);
          }
        }

        let cardSaved = false;
        if (
          saveCard === true &&
          paymentType === "credit_card" &&
          profileId &&
          (order.customerInfo?.email || order.customer_email)
        ) {
          try {
            const billingName = (cardholderName || "Customer").trim().split(" ").filter(Boolean);
            const saveEmail = order.customerInfo?.email || order.customer_email;
            const customerProfileResult = await createAuthorizeCustomerProfile(
              payNowEnvironment,
              DB_API_LOGIN_ID,
              DB_TRANSACTION_KEY,
              saveEmail,
              profileId
            );

            if (customerProfileResult.success && customerProfileResult.customerProfileId) {
              const paymentProfileResult = await createAuthorizePaymentProfile(
                payNowEnvironment,
                DB_API_LOGIN_ID,
                DB_TRANSACTION_KEY,
                customerProfileResult.customerProfileId,
                cardNumber,
                expirationDate,
                cvv,
                {
                  firstName: billingName[0] || "Customer",
                  lastName: billingName.length > 1 ? billingName.slice(1).join(" ") : "Customer",
                  address: address || "",
                  city: city || "",
                  state: state || "",
                  zip: zip || "",
                  country: country || "USA",
                }
              );

              if (paymentProfileResult.success && paymentProfileResult.paymentProfileId) {
                const cleanNumber = String(cardNumber || "").replace(/\s/g, "");
                const cardLastFour = cleanNumber.slice(-4);
                let cardType = "unknown";
                if (/^4/.test(cleanNumber)) cardType = "visa";
                else if (/^5[1-5]/.test(cleanNumber)) cardType = "mastercard";
                else if (/^3[47]/.test(cleanNumber)) cardType = "amex";
                else if (/^6(?:011|5)/.test(cleanNumber)) cardType = "discover";

                const expDigits = String(expirationDate || "").replace(/[\/\s-]/g, "");
                const expMonth = parseInt(expDigits.substring(0, 2), 10);
                const expYear = parseInt(`20${expDigits.substring(2, 4)}`, 10);

                const { error: saveMethodError } = await supabaseAdmin
                  .from("saved_payment_methods")
                  .insert({
                    profile_id: profileId,
                    customer_profile_id: customerProfileResult.customerProfileId,
                    payment_profile_id: paymentProfileResult.paymentProfileId,
                    method_type: "card",
                    card_last_four: cardLastFour,
                    card_type: cardType,
                    card_expiry_month: Number.isFinite(expMonth) ? expMonth : null,
                    card_expiry_year: Number.isFinite(expYear) ? expYear : null,
                    billing_first_name: billingName[0] || "Customer",
                    billing_last_name: billingName.length > 1 ? billingName.slice(1).join(" ") : "Customer",
                    billing_address: address || "",
                    billing_city: city || "",
                    billing_state: state || "",
                    billing_zip: zip || "",
                    billing_country: country || "USA",
                    is_default: false,
                    is_active: true,
                    nickname: `${cardType.charAt(0).toUpperCase() + cardType.slice(1)} **** ${cardLastFour}`,
                  });

                if (!saveMethodError) {
                  cardSaved = true;
                } else {
                  console.error("[pay-now] Failed to save card method:", saveMethodError);
                }
              } else {
                console.error("[pay-now] Failed to create customer payment profile:", paymentProfileResult.error);
              }
            } else {
              console.error("[pay-now] Failed to create customer profile:", customerProfileResult.error);
            }
          } catch (saveCardError) {
            console.error("[pay-now] Unexpected save-card error:", saveCardError);
          }
        }

        // 8c. Create or update invoice
        console.log(`[pay-now] ========== UPDATING INVOICE ==========`);
        try {
          const { data: existingInvoice } = await supabaseAdmin
            .from("invoices")
            .select("*")
            .eq("order_id", orderId)
            .maybeSingle();

          if (!existingInvoice) {
            console.log(`[pay-now] Creating NEW invoice...`);
            const dueDate = new Date(
              new Date(order.estimated_delivery || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000
            ).toISOString();

            const shippingCostVal = order.shipping_cost || 0;
            const discountVal = Number(order.discount_amount || 0);
            const subtotal = baseTotal;

            console.log(`[pay-now] Invoice amounts:`);
            console.log(`  - Subtotal: $${subtotal.toFixed(2)}`);
            console.log(`  - Tax: $${taxAmount.toFixed(2)}`);
            console.log(`  - Shipping: $${shippingCostVal}`);
            console.log(`  - Discount: $${discountVal.toFixed(2)}`);
            console.log(`  - Processing fee: $${totalProcessingFee.toFixed(2)}`);
            console.log(`  - Total: $${newTotalAmount.toFixed(2)}`);
            console.log(`  - Paid: $${newPaidAmount.toFixed(2)}`);

            const MAX_INVOICE_RETRIES = 5;
            let insertedInvoice = false;
            let lastInvoiceError = null;

            for (let attempt = 1; attempt <= MAX_INVOICE_RETRIES; attempt++) {
              const { data: generatedInvoiceNumber, error: invoiceNumberError } = await supabaseAdmin.rpc("generate_invoice_number");

              const invoiceNumber =
                !invoiceNumberError && generatedInvoiceNumber
                  ? generatedInvoiceNumber
                  : `INV-${new Date().getFullYear()}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)
                      .toString()
                      .padStart(3, "0")}`;

              const { error: invoiceInsertError } = await supabaseAdmin.from("invoices").insert({
                invoice_number: invoiceNumber,
                order_id: orderId,
                due_date: dueDate,
                profile_id: profileId || null,
                status: "pending",
                amount: subtotal,
                tax_amount: taxAmount,
                total_amount: newTotalAmount,
                processing_fee_amount: totalProcessingFee,
                payment_status: newPaymentStatus,
                payment_method: paymentType === "credit_card" ? "card" : "ach",
                notes: order.notes || null,
                purchase_number_external: order.purchase_number_external,
                items: order.items,
                customer_info: order.customerInfo,
                shipping_info: order.shippingAddress,
                shippin_cost: shippingCostVal,
                subtotal: subtotal,
                discount_amount: discountVal,
                discount_details: order.discount_details || [],
                paid_amount: newPaidAmount,
                payment_transication: transactionId || "",
              });

              if (!invoiceInsertError) {
                insertedInvoice = true;
                console.log(`[pay-now] ✅ Invoice created: ${invoiceNumber}`);
                break;
              }

              lastInvoiceError = invoiceInsertError;
              const isDuplicateInvoiceNumber =
                invoiceInsertError.code === "23505" &&
                String(invoiceInsertError.message || "").includes("invoices_invoice_number_key");

              if (!isDuplicateInvoiceNumber) {
                throw invoiceInsertError;
              }
              console.log(`[pay-now] Invoice number collision, retrying... (${attempt}/${MAX_INVOICE_RETRIES})`);
            }

            if (!insertedInvoice) {
              throw new Error(lastInvoiceError?.message || "Failed to create invoice after retries");
            }
          } else {
            console.log(`[pay-now] Updating EXISTING invoice: ${existingInvoice.invoice_number}`);
            
            // Update existing invoice - add processing fee to existing amounts
            const previousInvoiceProcessingFee = parseFloat(existingInvoice.processing_fee_amount?.toString() || "0");
            const previousInvoiceTotal = parseFloat(existingInvoice.total_amount?.toString() || "0");
            const previousInvoicePaid = parseFloat(existingInvoice.paid_amount?.toString() || "0");
            
            console.log(`[pay-now] Invoice BEFORE:`);
            console.log(`  - Total: $${previousInvoiceTotal.toFixed(2)}`);
            console.log(`  - Paid: $${previousInvoicePaid.toFixed(2)}`);
            console.log(`  - Processing fee: $${previousInvoiceProcessingFee.toFixed(2)}`);
            
            console.log(`[pay-now] Invoice AFTER:`);
            console.log(`  - Total: $${newTotalAmount.toFixed(2)}`);
            console.log(`  - Paid: $${newPaidAmount.toFixed(2)}`);
            console.log(`  - Processing fee: $${totalProcessingFee.toFixed(2)}`);
            
            const invoiceUpdateResult = await supabaseAdmin.from("invoices").update({
              payment_status: newPaymentStatus,
              paid_amount: newPaidAmount,
              total_amount: newTotalAmount,
              processing_fee_amount: totalProcessingFee,
              updated_at: new Date().toISOString(),
              payment_transication: transactionId || "",
              payment_method: paymentType === "credit_card" ? "card" : "ach",
            }).eq("order_id", orderId);
            
            if (invoiceUpdateResult.error) {
              console.error(`[pay-now] ❌ Failed to update invoice:`, invoiceUpdateResult.error);
              throw invoiceUpdateResult.error;
            }
            
            console.log(`[pay-now] ✅ Invoice updated successfully`);
          }
        } catch (invErr) {
          console.error("[pay-now] ❌ Invoice error:", invErr);
          // Don't fail the response — payment already went through
        }
        console.log(`[pay-now] ========== INVOICE UPDATE COMPLETE ==========`);

        // 8d. Log order activity
        try {
          await supabaseAdmin.from("order_activities").insert({
            order_id: orderId,
            activity_type: "payment_received",
            description: `Payment of $${amountApplied.toFixed(2)} received via ${paymentType === "credit_card" ? "card" : "ach"}${processingFeeAmount > 0 ? ` with $${processingFeeAmount.toFixed(2)} card fee` : ""} (Pay-Now link)`,
            performed_by_name: order.customerInfo?.name || "Customer",
            performed_by_email: order.customerInfo?.email || "",
            metadata: {
              order_number: order.order_number,
              payment_amount: amountApplied,
              charged_amount: amountToCharge,
              processing_fee_amount: processingFeeAmount,
              payment_method: paymentType === "credit_card" ? "card" : "ach",
              payment_id: transactionId,
              source: "pay_now_link",
            },
          });
        } catch (actErr) {
          console.error("Failed to log order activity:", actErr);
        }

        // 9. Return success to frontend
        return res.json({
          success: true,
          message: "Payment processed successfully",
          transactionId: transactionId,
          authCode: authCode,
          amount: amountToCharge,
          appliedAmount: amountApplied,
          processingFeeAmount,
          cardSaved,
          paymentStatus: newPaymentStatus,
        });
      } catch (processError) {
        console.error("Error processing pay-now payment response:", processError);
        return res.status(500).json({
          success: false,
          message: "Error processing payment response",
        });
      }
    });
  } catch (error) {
    console.error("Pay-now process error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Routes
app.use("/logs", require("./routes/logsRoute"))
app.use("/api/email", require("./routes/emailRoutes")) // Email tracking, webhooks, unsubscribe
app.use("/api/users", require("./routes/userRoutes")) // User management (secure)
app.use("/api/launch", require("./routes/launchRoutes")) // Website launch password reset & T&C
app.use("/api/otp", require("./routes/otpRoutes")) // OTP-based authentication
app.use("/api/terms", require("./routes/termsRoutes")) // Terms acceptance for admin-created users
app.use("/api/terms-management", require("./routes/termsManagementRoutes")) // Terms & ACH management
app.use("/api/cart", require("./routes/cartRoutes")) // Cart management & abandoned cart reminders
app.use("/api/profile", require("./routes/profileRoutes")) // Profile completion with secure magic links
app.use("/api/login-logs", require("./routes/loginLogsRoutes")) // Login logs and security monitoring

// Email endpoints with stricter rate limiting
app.post("/order-status", emailLimiter, orderSatusCtrl)
app.post("/order-place", emailLimiter, orderPlacedCtrl)
app.post("/po-email", requireAuth, emailLimiter, purchaseOrderEmailCtrl)
app.post("/user-verification", emailLimiter, userNotificationCtrl)

app.post("/active", emailLimiter, accountActivation)
app.post("/active-admin", emailLimiter, adminAccountActivation)
app.post("/password-confirmation", emailLimiter, adminAccountActivation)
app.post("/update-profile", emailLimiter, updateProfileNotification)
app.post("/pay-successfull", emailLimiter, paymentSuccessFull)

app.post("/contact", emailLimiter, contactCtrl)
app.post("/customization", emailLimiter, customization)
app.post("/paynow-user", emailLimiter, paymentLinkCtrl)
app.post("/group-invitation", emailLimiter, groupInvitationCtrl)
app.post("/invoice-quickbook", invoicesCtrl)

// Create signup profile for the authenticated signup user.
app.post("/create-signup-profile", requireAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: "Server configuration error - Supabase admin not initialized"
      });
    }

    const { userId, email, firstName, lastName, phone, termsAccepted, termsAcceptedAt, termsVersion } = req.body;

    // DEBUG: Log received data
    console.log("=== CREATE SIGNUP PROFILE DEBUG ===");
    console.log("Received data:", {
      userId,
      email,
      firstName,
      lastName,
      phone,
      termsAccepted,
      termsAcceptedAt,
      termsVersion
    });

    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: "userId and email are required"
      });
    }

    const authUserId = req.auth?.user?.id;
    const authEmail = (req.auth?.user?.email || "").toLowerCase().trim();
    const requestEmail = String(email || "").toLowerCase().trim();

    if (!authUserId || authUserId !== userId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden - user mismatch"
      });
    }

    if (!authEmail || authEmail !== requestEmail) {
      return res.status(400).json({
        success: false,
        message: "Email does not match authenticated user"
      });
    }

    // Prepare terms acceptance data
    const termsData = termsAccepted ? {
      accepted: true,
      acceptedAt: termsAcceptedAt || new Date().toISOString(),
      version: termsVersion || "1.0",
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: 'web_form',
      signature: null,
      signatureMethod: null
    } : null;

    // Prepare privacy policy data (same as terms during signup)
    const privacyData = termsAccepted ? {
      accepted: true,
      acceptedAt: termsAcceptedAt || new Date().toISOString(),
      version: termsVersion || "1.0",
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: 'web_form',
      signature: null,
      signatureMethod: null
    } : null;

    // DEBUG: Log prepared JSONB data
    console.log("Prepared JSONB data:");
    console.log("termsData:", JSON.stringify(termsData, null, 2));
    console.log("privacyData:", JSON.stringify(privacyData, null, 2));

    // Upsert profile using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: userId,
          email: email,
          first_name: firstName || "",
          last_name: lastName || "",
          mobile_phone: phone || "",
          work_phone: phone || "",
          display_name: `${firstName || ""} ${lastName || ""}`.trim(),
          type: "pharmacy",
          status: "pending",
          account_status: "pending",
          role: "user",
          active_notification: true,
          portal_access: false,
          email_notifaction: true,
          requires_password_reset: false,
          
          // NEW: JSONB columns (single source of truth)
          terms_and_conditions: termsData,
          privacy_policy: privacyData,
          
          // DUAL-WRITE: Keep old columns during transition (backward compatibility)
          terms_accepted: termsAccepted || false,
          terms_accepted_at: termsAccepted ? (termsAcceptedAt || new Date().toISOString()) : null,
          privacy_policy_accepted: termsAccepted || false,
          privacy_policy_accepted_at: termsAccepted ? (termsAcceptedAt || new Date().toISOString()) : null,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Signup profile creation error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      return res.status(400).json({
        success: false,
        message: "Failed to create profile"
      });
    }

    // DEBUG: Log created profile data
    console.log("Signup profile created/updated for:", email);
    console.log("Profile data:", {
      id: data.id,
      email: data.email,
      terms_accepted: data.terms_accepted,
      privacy_policy_accepted: data.privacy_policy_accepted,
      terms_and_conditions: data.terms_and_conditions,
      privacy_policy: data.privacy_policy
    });
    return res.json({
      success: true,
      message: "Profile created successfully",
      data: data
    });
  } catch (error) {
    console.error("Create signup profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

// Update user profile (uses admin client, but requires authenticated caller)
app.post("/update-user-profile", requireAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: "Server configuration error - Supabase admin not initialized"
      });
    }

    const profileData = req.body || {};
    delete profileData.parent_group;
    
    if (!profileData.id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    const userId = profileData.id;
    const callerId = req.auth?.user?.id;
    const callerRole = req.auth?.profile?.role;
    const isAdmin = ["admin", "superadmin"].includes(callerRole);
    const isGroup = callerRole === "group";
    const isSelfUpdate = callerId === userId;

    if (!callerId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    if (!isAdmin && !isSelfUpdate) {
      if (!isGroup) {
        return res.status(403).json({
          success: false,
          message: "Forbidden - you can only update your own profile"
        });
      }

      // Group users can update only users within their own group.
      const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
        .from("profiles")
        .select("id, group_id")
        .eq("id", userId)
        .maybeSingle();

      if (targetProfileError || !targetProfile) {
        return res.status(404).json({
          success: false,
          message: "Target profile not found"
        });
      }

      if (targetProfile.group_id !== callerId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden - group scope mismatch"
        });
      }
    }

    // Non-admin callers cannot mutate privileged flags.
    if (!isAdmin) {
      const restrictedKeys = [
        "role",
        "status",
        "account_status",
        "portal_access",
        "requires_password_reset",
        "group_id",
        "type",
      ];
      restrictedKeys.forEach((key) => delete profileData[key]);

      if (isSelfUpdate) {
        profileData.email = req.auth?.user?.email || profileData.email;
      } else if (isGroup) {
        delete profileData.email;
      }
    }

    // Enforce required fields for self-service profile completion/update flow.
    if (isSelfUpdate) {
      const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
      const missingFields = [];

      if (!isNonEmptyString(profileData.first_name)) missingFields.push("first_name");
      if (!isNonEmptyString(profileData.last_name)) missingFields.push("last_name");
      if (!isNonEmptyString(profileData.company_name)) missingFields.push("company_name");
      if (!isNonEmptyString(profileData.contact_person)) missingFields.push("contact_person");

      const workPhoneDigits = String(profileData.work_phone || "").replace(/\D/g, "");
      if (workPhoneDigits.length < 10) {
        return res.status(400).json({
          success: false,
          message: "work_phone must contain at least 10 digits",
        });
      }

      const billingAddress = profileData.billing_address || {};
      if (!isNonEmptyString(billingAddress.street1)) missingFields.push("billing_address.street1");
      if (!isNonEmptyString(billingAddress.city)) missingFields.push("billing_address.city");
      if (!isNonEmptyString(billingAddress.state)) missingFields.push("billing_address.state");
      if (!isNonEmptyString(billingAddress.zip_code)) missingFields.push("billing_address.zip_code");

      const billingCountry = billingAddress.countryRegion || billingAddress.country;
      if (!isNonEmptyString(billingCountry)) missingFields.push("billing_address.countryRegion");

      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Missing required profile fields: ${missingFields.join(", ")}`,
        });
      }
    }

    const userName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim();
    const userEmail = profileData.email;
    
    delete profileData.id; // Remove id from update data

    // Update profile using admin client (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(profileData)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Profile update error:", error);
      return res.status(400).json({
        success: false,
        message: "Failed to update profile"
      });
    }

    // Send profile update notification email
    if (userEmail && userName) {
      try {
        const { profileUpdateTemplate } = require("./templates/profiles");
        const mailSender = require("./utils/mailSender");
        const emailContent = profileUpdateTemplate(userName, userEmail);
        await mailSender(userEmail, "Profile Updated Successfully - 9RX", emailContent);
        console.log("Profile update email sent to:", userEmail);
      } catch (emailError) {
        console.error("Failed to send profile update email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: data
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
})



app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Your server is up and running ..."
  })
})

// Start Cron Jobs
const { startEmailCron } = require("./cron/emailCron");
startEmailCron(); // Unified email cron: queue processing, automations, abandoned carts, cleanup
const { startAutomationRunLogger } = require("./cron/automationRunLogger");
startAutomationRunLogger(); // Stream automation cron/manual execution summaries in terminal

app.listen(process.env.PORT, () => {
  console.log(`server is runing on port ${process.env.PORT}`);
});
