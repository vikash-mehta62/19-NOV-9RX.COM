const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");
const mailSender = require("../utils/mailSender");
const { requireAdmin } = require("../middleware/auth");

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * POST /api/cart/send-reminder
 * Send abandoned cart reminder email
 */
router.post("/send-reminder", requireAdmin, async (req, res) => {
  try {
    const { cartId } = req.body;

    if (!cartId) {
      return res.status(400).json({
        success: false,
        error: "Cart ID is required"
      });
    }

    // Fetch cart details with user info
    const { data: cart, error: cartError } = await supabase
      .from("carts")
      .select(`
        id,
        user_id,
        total,
        items,
        updated_at,
        reminder_sent_count,
        profiles (
          email,
          first_name,
          last_name,
          company_name
        )
      `)
      .eq("id", cartId)
      .single();

    if (cartError || !cart) {
      return res.status(404).json({
        success: false,
        error: "Cart not found"
      });
    }

    const userEmail = cart.profiles?.email;
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: "No email associated with this cart"
      });
    }

    // Prepare email content
    const userName = cart.profiles.first_name || cart.profiles.company_name || "Customer";

    // Calculate correct cart total from items
    let calculatedTotal = 0;
    let itemsHtml = '';

    if (cart.items && Array.isArray(cart.items)) {
      cart.items.forEach(item => {
        if (item.sizes && Array.isArray(item.sizes)) {
          // Item has sizes (like the cart structure we saw)
          item.sizes.forEach(size => {
            const sizeTotal = (size.quantity || 0) * (size.price || 0);
            calculatedTotal += sizeTotal;
            itemsHtml += `
              <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
                <p style="margin: 5px 0; color: #1f2937; font-weight: 600;">${item.name || 'Product'} - ${size.size_value || ''} ${item.unitToggle ? (size.size_unit || '') : ''}</p>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                  Quantity: ${size.quantity} × $${(size.price || 0).toFixed(2)} = $${sizeTotal.toFixed(2)}
                </p>
              </div>
            `;
          });
        } else {
          // Simple item structure
          const itemTotal = (item.quantity || 0) * (item.price || 0);
          calculatedTotal += itemTotal;
          itemsHtml += `
            <div style="border-bottom: 1px solid #e5e7eb; padding: 10px 0;">
              <p style="margin: 5px 0; color: #1f2937; font-weight: 600;">${item.name || 'Product'}</p>
              <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">
                Quantity: ${item.quantity} × $${(item.price || 0).toFixed(2)} = $${itemTotal.toFixed(2)}
              </p>
            </div>
          `;
        }
      });
    }

    const cartTotal = calculatedTotal;
    const itemCount = cart.items?.length || 0;

    const emailSubject = "You left something behind! 🛒";
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <img
            src="https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/9RX%20LOGO/9rx_logo.png"
            alt="9RX Logo"
            style="max-width: 140px; width: 100%; height: auto; display: inline-block;"
          />
        </div>

        <h2 style="color: #1f2937;">Hi ${userName},</h2>
        
        <p style="color: #4b5563; line-height: 1.6;">
          We noticed you left <strong>${itemCount} item${itemCount !== 1 ? 's' : ''}</strong> in your cart. 
          Don't worry, we've saved them for you!
        </p>

        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 10px; margin: 25px 0; text-align: center;">
          <p style="color: white; margin: 0 0 10px 0; font-size: 14px;">Your Cart Total</p>
          <h1 style="color: white; margin: 0; font-size: 36px;">$${cartTotal.toFixed(2)}</h1>
        </div>

        ${itemsHtml ? `
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin-top: 0;">Items in Your Cart:</h3>
            ${itemsHtml}
          </div>
        ` : ''}

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://9rx.com/pharmacy/order/create" 
             style="background-color: #2563eb; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
            Complete Your Order
          </a>
        </div>

        <p style="color: #6b7280; line-height: 1.6;">
          Need help? Our team is here to assist you with your order.
        </p>

        <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
          <p style="margin: 5px 0; font-size: 14px; color: #6c757d;"><strong>9RX - Your Trusted B2B Pharmacy Partner</strong></p>
          <p style="margin: 5px 0; font-size: 14px; color: #6c757d;">Need help? Contact us at <a href="mailto:info@9rx.com" style="color: #667eea; text-decoration: none;">info@9rx.com</a></p>
          <p style="margin-top: 20px; font-size: 12px; color: #999;">
            This is an automated email. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    // Send email
    const emailResult = await mailSender(userEmail, emailSubject, emailBody);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        error: emailResult.error || "Failed to send email"
      });
    }

    // Update cart with reminder timestamp and increment count
    const { error: updateError } = await supabase
      .from("carts")
      .update({
        abandoned_email_sent_at: new Date().toISOString(),
        reminder_sent_count: (cart.reminder_sent_count || 0) + 1
      })
      .eq("id", cartId);

    if (updateError) {
      console.error("Failed to update cart:", updateError);
      // Don't fail the request if email was sent successfully
    }

    res.json({
      success: true,
      message: `Reminder email sent to ${userEmail}`,
      messageId: emailResult.messageId
    });

  } catch (error) {
    console.error("Error sending cart reminder:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

module.exports = router;
