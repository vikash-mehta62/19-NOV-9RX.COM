const express = require("express");
const app = express();
const cors = require("cors");
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

const createRateLimiter = (windowMs, maxRequests) => {
  return (req, res, next) => {
    const key = req.ip;
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
  parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
);

const emailLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  parseInt(process.env.EMAIL_RATE_LIMIT_MAX) || 10 // 10 emails per 15 min
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
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));
const cookieParser = require("cookie-parser");

const logger = require("morgan");


const { orderSatusCtrl, orderPlacedCtrl, userNotificationCtrl, contactCtrl, customization, accountActivation, paymentLink, paymentLinkCtrl, adminAccountActivation, updateProfileNotification, paymentSuccessFull, groupInvitationCtrl } = require("./controllers/orderStatus");
const { invoicesCtrl } = require("./controllers/quickBooks");

app.use(logger("dev"));

app.use(cookieParser());

// CORS setup
const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://www.9rx.com",
  "https://9rx.com",
  "https://9rx.vercel.app"
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

app.post("/pay", async (req, res) => {
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
    const parsedData = {

      amount,
      cardNumber: cardNumber.toString(),
      expirationDate: expirationDate.toString(),
      cvv: cvv.toString(),
      cardholderName,
      address,
      city,
      state,
      zip,
      country
    };

    console.log("parsse", parsedData);





  
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
        console.log(apiResponse)
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


          if (transactionResponse && transactionResponse) {
            console.error("Payment API Error:", JSON.stringify(transactionResponse));
          }



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
            details: error.message,
          });
      }
    });
  } catch (error) {
    console.error("Unexpected Server Error:", error);
    res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
});

// FortisPay ACH Payment Endpoint
app.post("/pay-ach-fortispay", async (req, res) => {
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
    const FORTIS_API_URL = process.env.VITE_FORTIS_API_URL || "https://api.fortispay.com/v2";
    const FORTIS_USER_ID = process.env.VITE_FORTIS_USER_ID;
    const FORTIS_USER_API_KEY = process.env.VITE_FORTIS_USER_API_KEY;
    const FORTIS_LOCATION_ID = process.env.VITE_FORTIS_LOCATION_ID;
    const FORTIS_PRODUCT_TRANSACTION_ID = process.env.VITE_FORTIS_PRODUCT_TRANSACTION_ID_ACH;

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

    console.log("FortisPay ACH Request:", JSON.stringify(transactionRequest, null, 2));

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
    console.log("FortisPay ACH Response:", JSON.stringify(result, null, 2));

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
      const errorData = error.response.data;
      return res.status(error.response.status).json({
        success: false,
        error: errorData.message || errorData.error || "FortisPay API error",
        errorCode: errorData.code,
      });
    }
    
    return res.status(500).json({ 
      success: false,
      error: "Internal Server Error", 
      details: error.message 
    });
  }
});

// ACH/eCheck Payment Endpoint
app.post("/pay-ach", async (req, res) => {
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
          details: error.message,
        });
      }
    });
  } catch (error) {
    console.error("ACH Payment Error:", error);
    res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
});

// Test Authorize.net Connection
app.post("/test-authorize", async (req, res) => {
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
          details: error.message,
        });
      }
    });
  } catch (error) {
    console.error("Test Connection Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal Server Error", 
      details: error.message 
    });
  }
});

// ============================================
// PAY-NOW ENDPOINTS (Unauthenticated - for payment links sent via email)
// These bypass RLS by using supabaseAdmin (service role)
// ============================================

// Stricter rate limiter for pay-now endpoints (5 attempts per 15 minutes per IP)
const payNowLimiter = createRateLimiter(15 * 60 * 1000, 5);

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
    const itemsSubtotal = order.items?.reduce((total, item) => {
      return total + (item.sizes?.reduce((sum, size) => sum + size.quantity * size.price, 0) || 0);
    }, 0) || 0;

    const shippingCost = parseFloat(order.shipping_cost || "0");
    const taxAmount = parseFloat(order.tax_amount?.toString() || "0");
    const discountAmount = parseFloat(order.discount_amount?.toString() || "0");
    const isPurchaseOrder = order.poAccept === false;
    const handlingCharges = isPurchaseOrder ? parseFloat(order.po_handling_charges || "0") : 0;
    const fredCharges = isPurchaseOrder ? parseFloat(order.po_fred_charges || "0") : 0;

    const totalAmount = itemsSubtotal + shippingCost + taxAmount + handlingCharges + fredCharges - discountAmount;
    const paidAmount = Number(order.paid_amount || 0);
    const balanceDue = Math.abs(totalAmount - paidAmount) < 0.01 ? 0 : Math.max(0, totalAmount - paidAmount);

    if (balanceDue <= 0) {
      return res.status(400).json({ success: false, message: "No balance due on this order" });
    }

    const amountToCharge = parseFloat(balanceDue.toFixed(2));

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
    orderDetails.setInvoiceNumber(order.order_number || `ORD-${Date.now()}`);
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
        console.log(`[pay-now] Payment successful for order ${order.order_number}, txn: ${transactionId}`);

        const newPaidAmount = paidAmount + amountToCharge;
        const orderTotal = totalAmount;
        const newPaymentStatus = newPaidAmount >= orderTotal ? "paid" : "partial_paid";

        // 8a. Update order
        await supabaseAdmin.from("orders").update({
          payment_status: newPaymentStatus,
          paid_amount: newPaidAmount,
          updated_at: new Date().toISOString(),
        }).eq("id", orderId);

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

        // 8c. Create or update invoice
        try {
          const { data: existingInvoice } = await supabaseAdmin
            .from("invoices")
            .select("*")
            .eq("order_id", orderId)
            .maybeSingle();

          if (!existingInvoice) {
            // Generate invoice number
            const year = new Date().getFullYear();
            const { data: inData } = await supabaseAdmin
              .from("centerize_data")
              .select("id, invoice_no, invoice_start")
              .order("id", { ascending: false })
              .limit(1);

            const newInvNo = (inData?.[0]?.invoice_no || 0) + 1;
            const invoiceStart = inData?.[0]?.invoice_start || "INV";

            if (inData?.[0]?.id) {
              await supabaseAdmin
                .from("centerize_data")
                .update({ invoice_no: newInvNo })
                .eq("id", inData[0].id);
            }

            const invoiceNumber = `${invoiceStart}-${year}${newInvNo.toString().padStart(6, "0")}`;
            const dueDate = new Date(
              new Date(order.estimated_delivery || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000
            ).toISOString();

            const shippingCostVal = order.shipping_cost || 0;
            const discountVal = Number(order.discount_amount || 0);
            const subtotal = amountToCharge + discountVal - taxAmount - shippingCostVal;

            await supabaseAdmin.from("invoices").insert({
              invoice_number: invoiceNumber,
              order_id: orderId,
              due_date: dueDate,
              profile_id: profileId || null,
              status: "pending",
              amount: subtotal,
              tax_amount: taxAmount,
              total_amount: amountToCharge,
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
          } else {
            // Update existing invoice
            await supabaseAdmin.from("invoices").update({
              payment_status: newPaymentStatus,
              paid_amount: newPaidAmount,
              updated_at: new Date().toISOString(),
              payment_transication: transactionId || "",
              payment_method: paymentType === "credit_card" ? "card" : "ach",
            }).eq("order_id", orderId);
          }
        } catch (invErr) {
          console.error("Failed to create/update invoice:", invErr);
          // Don't fail the response — payment already went through
        }

        // 8d. Log order activity
        try {
          await supabaseAdmin.from("order_activities").insert({
            order_id: orderId,
            activity_type: "payment_received",
            description: `Payment of $${amountToCharge.toFixed(2)} received via ${paymentType === "credit_card" ? "card" : "ach"} (Pay-Now link)`,
            performed_by_name: order.customerInfo?.name || "Customer",
            performed_by_email: order.customerInfo?.email || "",
            metadata: {
              order_number: order.order_number,
              payment_amount: amountToCharge,
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

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Routes
app.use("/logs", require("./routes/logsRoute"))
app.use("/api/email", require("./routes/emailRoutes")) // Email tracking, webhooks, unsubscribe
app.use("/api/users", require("./routes/userRoutes")) // User management (secure)
app.use("/api/launch", require("./routes/launchRoutes")) // Website launch password reset & T&C
app.use("/api/otp", require("./routes/otpRoutes")) // OTP-based authentication
app.use("/api/terms", require("./routes/termsRoutes")) // Terms acceptance for admin-created users
app.use("/api/terms-management", require("./routes/termsManagementRoutes")) // Terms & ACH management
app.use("/api/cart", require("./routes/cartRoutes")) // Cart management & abandoned cart reminders

// Email endpoints with stricter rate limiting
app.post("/order-status", emailLimiter, orderSatusCtrl)
app.post("/order-place", emailLimiter, orderPlacedCtrl)
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

// Create signup profile (bypasses RLS - used during signup when user is not yet authenticated)
app.post("/create-signup-profile", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: "Server configuration error - Supabase admin not initialized"
      });
    }

    const { userId, email, firstName, lastName, phone, termsAccepted, termsAcceptedAt, termsVersion } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: "userId and email are required"
      });
    }

    // Verify this userId actually exists in auth.users
    const { data: authUser, error: authCheckError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authCheckError || !authUser?.user) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID - user does not exist in auth"
      });
    }

    // Prepare terms acceptance data
    const termsData = termsAccepted ? {
      accepted: true,
      acceptedAt: termsAcceptedAt || new Date().toISOString(),
      version: termsVersion || "1.0",
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    } : null;

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
          role: "user",
          requires_password_reset: false,
          terms_and_conditions: termsData,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Signup profile creation error:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to create profile"
      });
    }

    console.log("Signup profile created/updated for:", email);
    return res.json({
      success: true,
      message: "Profile created successfully",
      data: data
    });
  } catch (error) {
    console.error("Create signup profile error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
});

// Update user profile (bypasses RLS for self-update flow)
app.post("/update-user-profile", async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({
        success: false,
        message: "Server configuration error - Supabase admin not initialized"
      });
    }

    const profileData = req.body;
    
    if (!profileData.id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required"
      });
    }

    const userId = profileData.id;
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
        message: error.message || "Failed to update profile"
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
      message: error.message || "Internal server error"
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

app.listen(process.env.PORT, () => {
  console.log(`server is runing on port ${process.env.PORT}`);
});
