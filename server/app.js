const express = require("express");
const app = express();
const cors = require("cors");
const ApiContracts = require("authorizenet").APIContracts;
const ApiControllers = require("authorizenet").APIControllers;
const SDKConstants = require("authorizenet").Constants;
const dotenv = require("dotenv");
const connectDB = require("./config/db");



dotenv.config();
connectDB();

// body parser
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ limit: "500mb", extended: true }));
const cookieParser = require("cookie-parser");

const logger = require("morgan");


const { orderSatusCtrl, orderPlacedCtrl, userNotificationCtrl, contactCtrl, customization, accountActivation, paymentLink, paymentLinkCtrl, adminAccountActivation, updateProfileNotification, paymentSuccessFull } = require("./controllers/orderStatus");
const { invoicesCtrl } = require("./controllers/quickBooks");

app.use(logger("dev"));

app.use(cookieParser());

// CORS setup
const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://www.9rx.com",
  "https://9rx.com"
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
const ENVIRONMENT = SDKConstants.endpoint.production; 
// const ENVIRONMENT = SDKConstants.endpoint.sandbox;

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


    // Set up payment method
    let paymentType;
    if (cardNumber) {
      const creditCard = new ApiContracts.CreditCardType();
      creditCard.setCardNumber(cardNumber);
      creditCard.setExpirationDate(expirationDate);
      creditCard.setCardCode(cvv);
      paymentType = new ApiContracts.PaymentType();
      paymentType.setCreditCard(creditCard);
      accountNumber = undefined; // Bank account validation ko bypass karega

    } else if (false) {
      const bankAccount = new ApiContracts.BankAccountType();
      bankAccount.setAccountType(
        ApiContracts.BankAccountTypeEnum[accountType.toUpperCase()]
      );
      bankAccount.setRoutingNumber(routingNumber);
      bankAccount.setAccountNumber(accountNumber);
      bankAccount.setNameOnAccount(nameOnAccount);
      paymentType = new ApiContracts.PaymentType();
      paymentType.setBankAccount(bankAccount);
    } else {
      return res.status(400).json({ error: "Invalid payment details" });
    }

    // Create order details
    const orderDetails = new ApiContracts.OrderType();
    orderDetails.setInvoiceNumber(invoiceNumber || `INV-${Math.floor(Math.random() * 100000)}`);
    orderDetails.setDescription("Product Description");

    // Set billing information
    const billTo = new ApiContracts.CustomerAddressType();
    const firstName = cardholderName
      ? cardholderName.split(" ")[0]
      : nameOnAccount.split(" ")[0];
    const lastName = cardholderName
      ? cardholderName.split(" ").length > 1
        ? cardholderName.split(" ").slice(1).join(" ")
        : ""
      : nameOnAccount.split(" ").length > 1
        ? nameOnAccount.split(" ").slice(1).join(" ")
        : "";

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
          if (response.getMessages() && response.getMessages().getMessage()) {
            const messages = response.getMessages().getMessage();
            console.log(response)
            if (messages.length > 0) {
              console.log(messages)
              errorMessage = messages[0].getText();
              errorCode = messages[0].code;
            }
          }
          return res.status(400).json({
            success: false,
            message: "Transaction Failed",
            error: errorMessage,
            errocode:errorCode
            
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

app.use("/logs", require("./routes/logsRoute"))

app.post("/order-status", orderSatusCtrl)
app.post("/order-place", orderPlacedCtrl)
app.post("/user-verification", userNotificationCtrl)

app.post("/active", accountActivation)
app.post("/active-admin", adminAccountActivation)
app.post("/password-confirmation", adminAccountActivation)
app.post("/update-profile", updateProfileNotification)
app.post("/pay-successfull", paymentSuccessFull)

app.post("/contact", contactCtrl)
app.post("/customization", customization)
app.post("/paynow-user", paymentLinkCtrl)
app.post("/invoice-quickbook", invoicesCtrl)



app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Your server is up and running ..."
  })
})

app.listen(process.env.PORT, () => {
  console.log(`server is runing on port ${process.env.PORT}`);
});
