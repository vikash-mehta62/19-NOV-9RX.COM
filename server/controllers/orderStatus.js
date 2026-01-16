
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
const signupSuccessTemplate = require("../templates/signupSuccessTemplate");
const mailSender = require("../utils/mailSender");
const { triggerAutomation, trackConversion } = require("../cron/emailCron");

// Admin email from environment variable with fallback
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "sppatel@9rx.com";


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

    // Trigger automation based on order status
    const status = order.status?.toLowerCase();
    if (status === 'shipped') {
      await triggerAutomation('order_shipped', {
        email: order.customerInfo.email,
        userId: order.userId || order.profile_id,
        firstName: order.customerInfo.firstName || order.customerInfo.name?.split(' ')[0],
        lastName: order.customerInfo.lastName || order.customerInfo.name?.split(' ').slice(1).join(' '),
        order_number: order.order_number || order.orderNumber || order.id,
        tracking_number: order.tracking_number || order.trackingNumber || '',
        shipping_method: order.shipping_method || order.shippingMethod || '',
      }); 
    } else if (status === 'delivered') {
      await triggerAutomation('order_delivered', {
        email: order.customerInfo.email,
        userId: order.userId || order.profile_id,
        firstName: order.customerInfo.firstName || order.customerInfo.name?.split(' ')[0],
        lastName: order.customerInfo.lastName || order.customerInfo.name?.split(' ').slice(1).join(' '),
        order_number: order.order_number || order.orderNumber || order.id,
      });
    }

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

    // Send email to customer
    await mailSender(
      order.customerInfo.email,
      "Order Placed Successfully - 9RX",
      emailContent
    );
    // Send notification to admin
    await mailSender(
      ADMIN_EMAIL,
      "New Order Placed",
      emailContentAdmin
    );

    // Trigger order_placed automation
    await triggerAutomation('order_placed', {
      email: order.customerInfo.email,
      userId: order.userId || order.profile_id,
      firstName: order.customerInfo.firstName || order.customerInfo.name?.split(' ')[0],
      lastName: order.customerInfo.lastName || order.customerInfo.name?.split(' ').slice(1).join(' '),
      order_number: order.order_number || order.orderNumber || order.id,
      order_total: order.total_amount || order.totalAmount || order.total,
      item_count: order.items?.length || 0,
    });

    // Track conversion (user made a purchase)
    if (order.userId || order.profile_id) {
      await trackConversion(
        order.userId || order.profile_id,
        order.orderNumber || order.id,
        order.totalAmount || order.total
      );
    }

    // Check if this is user's first purchase
    // Note: This would need to be checked against order history
    // For now, we'll trigger first_purchase automation and let the automation's
    // send_limit_per_user handle preventing duplicates
    await triggerAutomation('first_purchase', {
      email: order.customerInfo.email,
      userId: order.userId || order.profile_id,
      firstName: order.customerInfo.firstName || order.customerInfo.name?.split(' ')[0],
      lastName: order.customerInfo.lastName || order.customerInfo.name?.split(' ').slice(1).join(' '),
      order_number: order.order_number || order.orderNumber || order.id,
      order_total: order.total_amount || order.totalAmount || order.total,
    });

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
    const { groupname, name, email, userId } = req.body;
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required order details.",
      });
    }
    const emailContent = userVerificationTemplate(groupname, name, email);
    const userEmailContent = signupSuccessTemplate(name);

    // Notify Admin
    await mailSender(
      ADMIN_EMAIL,
      "New User Registration - Verification Required",
      emailContent
    );

    // Notify User
    await mailSender(
      email,
      "Welcome to 9RX - Registration Received",
      userEmailContent
    );

    // Trigger welcome automation
    const nameParts = name.split(' ');
    await triggerAutomation('welcome', {
      email: email,
      userId: userId,
      firstName: nameParts[0] || name,
      lastName: nameParts.slice(1).join(' ') || '',
      group_name: groupname || '',
    });

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
      ADMIN_EMAIL,
      "New Contact Form Submission",
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
      ADMIN_EMAIL,
      "New Customization Request",
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
      `Complete Your Payment - Order #${order.order_number || order.orderNumber || 'N/A'} | 9RX`,
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
    const { name, email } = req.body;

    // Ensure required fields are present
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required details: name and email are required.",
      });
    }

    // Generate email content using the template
    const emailContent = passwordResetTemplate(name);

    // Send email
    await mailSender(
      email,
      "Password Reset Confirmation - 9RX",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Password reset confirmation email sent",
    });
  } catch (error) {
    console.error("Error in Password Confirmation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send password confirmation email",
      error: error.message,
    });
  }
};

exports.updateProfileNotification = async (req, res) => {
  try {
    const { name, email } = req.body;

    // Ensure required fields are present
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required details: name and email are required.",
      });
    }

    // Generate email content using the template
    const emailContent = profileUpdateTemplate(name, email);

    // Send email
    await mailSender(
      email,
      "Profile Updated Successfully - 9RX",
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Profile update notification sent",
    });
  } catch (error) {
    console.error("Error in Profile Update Notification:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send profile update notification",
      error: error.message,
    });
  }
};

exports.paymentSuccessFull = async (req, res) => {
  try {
    const { name, email, orderNumber, transactionId } = req.body;

    // Ensure required fields are present
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Missing required details: name and email are required.",
      });
    }

    // Generate email content using the template
    const emailContent = paymentSuccessTemplate(name, orderNumber, transactionId);

    // Send email
    await mailSender(
      email,
      `Payment Successful - Order #${orderNumber || 'N/A'} - 9RX`,
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Payment confirmation email sent",
    });
  } catch (error) {
    console.error("Error in Payment Success Notification:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send payment confirmation email",
      error: error.message,
    });
  }
};




// Group Invitation Email
const groupInvitationTemplate = require("../templates/groupInvitationTemplate");

exports.groupInvitationCtrl = async (req, res) => {
  try {
    const {
      email,
      pharmacyName,
      contactPerson,
      groupName,
      inviterName,
      inviteLink,
      expiresAt,
      personalMessage,
    } = req.body;

    // Validate required fields
    if (!email || !pharmacyName || !groupName || !inviteLink) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: email, pharmacyName, groupName, inviteLink",
      });
    }

    // Generate email content
    const emailContent = groupInvitationTemplate({
      pharmacyName,
      contactPerson,
      groupName,
      inviterName: inviterName || groupName,
      inviteLink,
      expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      personalMessage,
    });

    // Send email
    await mailSender(
      email,
      `You're Invited to Join ${groupName} on 9RX`,
      emailContent
    );

    return res.status(200).json({
      success: true,
      message: "Invitation email sent successfully",
    });
  } catch (error) {
    console.error("Error sending group invitation:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send invitation email",
      error: error.message,
    });
  }
};
