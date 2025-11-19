
const accountActiveTemplate = require("../templates/accountActiveTemplate");
const adminAccountActiveTemplate = require("../templates/adminCreateAccount");
const adminOrderNotificationTemplate = require("../templates/adminOrderPlaced");
const { contactUsEmail } = require("../templates/contactFormRes");
const { customizationQueryEmail } = require("../templates/customizationQuaery");
const orderConfirmationTemplate = require("../templates/orderCreate");
const orderStatusTemplate = require("../templates/orderTemlate");
const paymentLink = require("../templates/paymentLink");
const { passwordResetTemplate, profileUpdateTemplate, paymentSuccessTemplate } = require("../templates/profiles");
const userVerificationTemplate = require("../templates/userVerificationTemplate");
const mailSender = require("../utils/mailSender");


exports.orderSatusCtrl = async (req, res) => {
  try {
    const order = req.body;

    if (!order || !order.customerInfo || !order.customerInfo.email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    // Generate email content using the template
    const emailContent = orderStatusTemplate(order);

    // Send email
    await mailSender(
      order.customerInfo.email,
      "Order Status Update",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Order status email sent successfully!",
    });
  } catch (error) {
    console.error("Error in Order Status Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in Order Status",
      error: error.message,
    });
  }
};


exports.orderPlacedCtrl = async (req, res) => {
  try {
    const order = req.body;

    console.log(order)

    // Ensure required fields are present
    if (!order || !order.customerInfo || !order.customerInfo.email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    // Generate email content using the template
    const emailContent = orderConfirmationTemplate(order);
    const emailContentAdmin = adminOrderNotificationTemplate(order);

    // Send email
    await mailSender(
      order.customerInfo.email,
      "Order Placed ",
      emailContent
    );
    await mailSender(
      "sppatel@9rx.com",
      "New Order Placed ",
      emailContentAdmin
    );

    return res.status(200).json({
      success: true,
      message: "Order status email sent successfully!",
    });
  } catch (error) {
    console.error("Error in Order Status Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in Order Status",
      error: error.message,
    });
  }
};


exports.userNotificationCtrl = async (req, res) => {
  try {
    const { groupname, name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }
    const emailContent = userVerificationTemplate(groupname, name, email);

    await mailSender(
      "sppatel@9rx.com",
      "New User",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Order status email sent successfully!",
    });
  } catch (error) {
    console.error("Error in Order Status Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in Order Status",
      error: error.message,
    });
  }
};


exports.accountActivation = async (req, res) => {
  try {
    const { name, email, admin = false } = req.body;


    // Ensure required fields are present
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    // Generate email content using the template
    const emailContent = accountActiveTemplate(name, email, admin);

    // Send email
    await mailSender(
      email,
      "Your Account Active Successfully! ",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Account Active",
    });
  } catch (error) {
    console.error("Error in Order Status Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in Order Status",
      error: error.message,
    });
  }
};

exports.adminAccountActivation = async (req, res) => {
  try {
    const { name, email, admin = false } = req.body;


    // Ensure required fields are present
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    // Generate email content using the template
    const emailContent = adminAccountActiveTemplate(name, email, admin);

    // Send email
    await mailSender(
      email,
      "Your Account has been created Successfully! ",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Account Active",
    });
  } catch (error) {
    console.error("Error in Order Status Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in Order Status",
      error: error.message,
    });
  }
};


exports.contactCtrl = async (req, res) => {
  const { name, email, contact, message } = req.body;
  try {

    if (!name || !contact) {
      return res.status(500).send({
        message: "Plase provide all fields",
        success: false
      })
    }

    const emailRes = await mailSender(
      "sppatel@9rx.com",
      "Contact Details",
      contactUsEmail(name, email, contact, message)
    )
    res.status(200).send({
      message: "Email send successfully.Our team will contact you soon!",
      emailRes,
      success: true
    })
  } catch (error) {
    console.log(error)
    res.status(500).send({
      message: "Error in sending email",
    })
  }
}


exports.customization = async (req, res) => {
  const { name, email, phone, selectedProducts } = req.body;
  try {

    if (!name || !phone) {
      return res.status(500).send({
        message: "Plase provide all fields",
        success: false
      })
    }

    const emailRes = await mailSender(
      "sppatel@9rx.com",
      "Your Data send successfully",
      customizationQueryEmail(name, email, phone, selectedProducts)
    )
    res.status(200).send({
      message: "Email send successfully.Our team will contact you soon!",
      emailRes,
      success: true
    })
  } catch (error) {
    console.log(error)
    res.status(500).send({
      message: "Error in sending email",
    })
  }
}


exports.paymentLinkCtrl = async (req, res) => {
  try {
    const order = req.body;
console.log(order)
    if (!order || !order.customerInfo || !order.customerInfo.email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    const emailContent = paymentLink(order);

    await mailSender(
      order.customerInfo.email,
      "Payment Link Send Successfully!",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Payment Link Send Successfully",
    });
  } catch (error) {
    console.error("Error in payment link:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in payment link",
      error: error.message,
    });
  }
}


exports.passwordConfirmationNotification = async (req, res) => {
  try {
    const { name, email, admin = false } = req.body;


    // Ensure required fields are present
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    // Generate email content using the template
    const emailContent = passwordResetTemplate(name);

    // Send email
    await mailSender(
      email,
      "Your Account Active Successfully! ",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Account Active",
    });
  } catch (error) {
    console.error("Error in Order Status Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in Order Status",
      error: error.message,
    });
  }
};

exports.updateProfileNotification = async (req, res) => {
  try {
    const { name, email, admin = false } = req.body;


    // Ensure required fields are present
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    // Generate email content using the template
    const emailContent = profileUpdateTemplate(name,email);

    // Send email
    await mailSender(
      email,
      "Your Account Active Successfully! ",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Account Active",
    });
  } catch (error) {
    console.error("Error in Order Status Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in Order Status",
      error: error.message,
    });
  }
};

exports.paymentSuccessFull = async (req, res) => {
  try {
    const { name, email,  orderNumber, transactionId } = req.body;


    // Ensure required fields are present
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }

    // Generate email content using the template
    const emailContent = paymentSuccessTemplate(name, orderNumber, transactionId);

    // Send email
    await mailSender(
      email,
      "Your Account Active Successfully! ",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Account Active",
    });
  } catch (error) {
    console.error("Error in Order Status Controller:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong in Order Status",
      error: error.message,
    });
  }
};



