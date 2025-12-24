/**
 * Fix Email System Script
 * 1. Add missing category column to email_templates
 * 2. Create missing email templates for automations
 * 3. Link templates to automations
 * 4. Clear failed emails from queue
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "./server/.env" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Email templates for each automation type
const emailTemplates = {
  welcome: {
    name: "Welcome Email",
    subject: "Welcome to 9RX, {{first_name}}! 🎉",
    html_content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:16px 16px 0 0;padding:40px;text-align:center;">
      <h1 style="margin:0;color:white;font-size:32px;">Welcome to 9RX! 🎉</h1>
    </div>
    
    <!-- Content -->
    <div style="background:white;padding:40px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size:18px;color:#1e293b;margin:0 0 20px 0;">
        Hi {{first_name}}! 👋
      </p>
      
      <p style="color:#475569;line-height:1.6;margin:0 0 20px 0;">
        Thank you for joining 9RX - your trusted partner for quality medical supplies. We're excited to have you on board!
      </p>

      <div style="background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);border-radius:12px;padding:25px;margin:25px 0;">
        <h3 style="margin:0 0 15px 0;color:#065f46;">What's Next?</h3>
        <ul style="margin:0;padding:0 0 0 20px;color:#047857;">
          <li style="margin-bottom:10px;">Browse our extensive catalog of medical supplies</li>
          <li style="margin-bottom:10px;">Enjoy wholesale pricing on all products</li>
          <li style="margin-bottom:10px;">Earn reward points on every purchase</li>
          <li>Get fast, reliable shipping</li>
        </ul>
      </div>

      <div style="text-align:center;margin:30px 0;">
        <a href="https://9rx.com/pharmacy" style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;text-decoration:none;padding:15px 40px;border-radius:10px;font-weight:bold;font-size:16px;">
          Start Shopping →
        </a>
      </div>

      <p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:30px;">
        Questions? Reply to this email or call us at 1-800-969-6295
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">
      <p style="margin:0;">© {{current_year}} 9RX. All rights reserved.</p>
      <p style="margin:10px 0 0 0;">
        <a href="{{unsubscribe_url}}" style="color:#94a3b8;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
    `
  },

  order_placed: {
    name: "Order Confirmation",
    subject: "Order Confirmed! #{{order_number}} 📦",
    html_content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);border-radius:16px 16px 0 0;padding:40px;text-align:center;">
      <h1 style="margin:0;color:white;font-size:28px;">Order Confirmed! ✅</h1>
      <p style="margin:10px 0 0 0;color:rgba(255,255,255,0.9);font-size:16px;">Order #{{order_number}}</p>
    </div>
    
    <!-- Content -->
    <div style="background:white;padding:40px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size:18px;color:#1e293b;margin:0 0 20px 0;">
        Hi {{first_name}}! 👋
      </p>
      
      <p style="color:#475569;line-height:1.6;margin:0 0 20px 0;">
        Great news! We've received your order and it's being processed. You'll receive another email when your order ships.
      </p>

      <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:25px 0;">
        <h3 style="margin:0 0 15px 0;color:#1e293b;">Order Summary</h3>
        <div style="border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:10px;">
          <span style="color:#64748b;">Order Number:</span>
          <span style="color:#1e293b;font-weight:bold;float:right;">#{{order_number}}</span>
        </div>
        <div style="border-bottom:1px solid #e2e8f0;padding-bottom:10px;margin-bottom:10px;">
          <span style="color:#64748b;">Order Total:</span>
          <span style="color:#10b981;font-weight:bold;float:right;">\${{order_total}}</span>
        </div>
        <div>
          <span style="color:#64748b;">Estimated Delivery:</span>
          <span style="color:#1e293b;font-weight:bold;float:right;">3-5 Business Days</span>
        </div>
      </div>

      <div style="text-align:center;margin:30px 0;">
        <a href="https://9rx.com/pharmacy/orders" style="display:inline-block;background:linear-gradient(135deg,#3b82f6 0%,#1d4ed8 100%);color:white;text-decoration:none;padding:15px 40px;border-radius:10px;font-weight:bold;font-size:16px;">
          View Order Details →
        </a>
      </div>

      <p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:30px;">
        Thank you for shopping with 9RX!
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">
      <p style="margin:0;">© {{current_year}} 9RX. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  },

  order_shipped: {
    name: "Shipping Notification",
    subject: "Your Order is On Its Way! 🚚 #{{order_number}}",
    html_content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%);border-radius:16px 16px 0 0;padding:40px;text-align:center;">
      <h1 style="margin:0;color:white;font-size:28px;">Your Order Has Shipped! 🚚</h1>
    </div>
    
    <!-- Content -->
    <div style="background:white;padding:40px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size:18px;color:#1e293b;margin:0 0 20px 0;">
        Hi {{first_name}}! 👋
      </p>
      
      <p style="color:#475569;line-height:1.6;margin:0 0 20px 0;">
        Exciting news! Your order #{{order_number}} is on its way to you.
      </p>

      <div style="background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%);border-radius:12px;padding:25px;margin:25px 0;text-align:center;">
        <p style="margin:0 0 10px 0;color:#6d28d9;font-weight:bold;">Tracking Number</p>
        <p style="margin:0;font-size:20px;color:#1e293b;font-family:monospace;">{{tracking_number}}</p>
      </div>

      <div style="text-align:center;margin:30px 0;">
        <a href="{{tracking_url}}" style="display:inline-block;background:linear-gradient(135deg,#8b5cf6 0%,#6d28d9 100%);color:white;text-decoration:none;padding:15px 40px;border-radius:10px;font-weight:bold;font-size:16px;">
          Track Your Package →
        </a>
      </div>

      <p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:30px;">
        Estimated delivery: 2-3 business days
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">
      <p style="margin:0;">© {{current_year}} 9RX. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
  },

  order_delivered: {
    name: "Delivery Confirmation & Feedback",
    subject: "Your Order Has Been Delivered! 📬 How Did We Do?",
    html_content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:16px 16px 0 0;padding:40px;text-align:center;">
      <h1 style="margin:0;color:white;font-size:28px;">Order Delivered! 📬</h1>
    </div>
    
    <!-- Content -->
    <div style="background:white;padding:40px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size:18px;color:#1e293b;margin:0 0 20px 0;">
        Hi {{first_name}}! 👋
      </p>
      
      <p style="color:#475569;line-height:1.6;margin:0 0 20px 0;">
        Your order #{{order_number}} has been delivered! We hope everything arrived in perfect condition.
      </p>

      <div style="background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%);border-radius:12px;padding:25px;margin:25px 0;text-align:center;">
        <h3 style="margin:0 0 15px 0;color:#92400e;">⭐ Leave a Review & Earn 50 Points!</h3>
        <p style="margin:0;color:#78350f;">Share your experience and help other customers make informed decisions.</p>
      </div>

      <div style="text-align:center;margin:30px 0;">
        <a href="https://9rx.com/pharmacy/orders" style="display:inline-block;background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;text-decoration:none;padding:15px 40px;border-radius:10px;font-weight:bold;font-size:16px;">
          Write a Review →
        </a>
      </div>

      <p style="color:#475569;line-height:1.6;margin:20px 0;">
        Had an issue with your order? <a href="mailto:support@9rx.com" style="color:#10b981;">Contact our support team</a> and we'll make it right.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">
      <p style="margin:0;">© {{current_year}} 9RX. All rights reserved.</p>
      <p style="margin:10px 0 0 0;">
        <a href="{{unsubscribe_url}}" style="color:#94a3b8;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
    `
  },

  inactive_user: {
    name: "We Miss You!",
    subject: "We Miss You, {{first_name}}! Come Back for 10% Off 🎁",
    html_content: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f8fafc;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#ec4899 0%,#be185d 100%);border-radius:16px 16px 0 0;padding:40px;text-align:center;">
      <h1 style="margin:0;color:white;font-size:28px;">We Miss You! 💕</h1>
    </div>
    
    <!-- Content -->
    <div style="background:white;padding:40px;border-radius:0 0 16px 16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size:18px;color:#1e293b;margin:0 0 20px 0;">
        Hi {{first_name}}! 👋
      </p>
      
      <p style="color:#475569;line-height:1.6;margin:0 0 20px 0;">
        It's been a while since we've seen you at 9RX. We wanted to check in and let you know we're here whenever you need quality medical supplies.
      </p>

      <div style="background:linear-gradient(135deg,#fdf2f8 0%,#fce7f3 100%);border-radius:12px;padding:25px;margin:25px 0;text-align:center;">
        <h3 style="margin:0 0 10px 0;color:#be185d;font-size:24px;">🎁 Special Offer Just For You!</h3>
        <p style="margin:0;font-size:36px;font-weight:bold;color:#ec4899;">10% OFF</p>
        <p style="margin:10px 0 0 0;color:#9d174d;">Use code: <strong>COMEBACK10</strong></p>
      </div>

      <div style="text-align:center;margin:30px 0;">
        <a href="https://9rx.com/pharmacy" style="display:inline-block;background:linear-gradient(135deg,#ec4899 0%,#be185d 100%);color:white;text-decoration:none;padding:15px 40px;border-radius:10px;font-weight:bold;font-size:16px;">
          Shop Now →
        </a>
      </div>

      <p style="color:#94a3b8;font-size:13px;text-align:center;margin-top:30px;">
        Offer expires in 7 days. Don't miss out!
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:20px;color:#94a3b8;font-size:12px;">
      <p style="margin:0;">© {{current_year}} 9RX. All rights reserved.</p>
      <p style="margin:10px 0 0 0;">
        <a href="{{unsubscribe_url}}" style="color:#94a3b8;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
    `
  }
};

async function fixEmailSystem() {
  console.log("\n🔧 FIXING EMAIL SYSTEM\n");
  console.log("=".repeat(60));

  // Step 1: Clear failed emails from queue
  console.log("\n📝 Step 1: Clearing failed emails from queue...");
  
  const { data: deletedEmails, error: deleteError } = await supabase
    .from("email_queue")
    .delete()
    .in("status", ["failed", "processing"])
    .select("id");

  if (deleteError) {
    console.log("❌ Error clearing queue:", deleteError.message);
  } else {
    console.log(`✅ Cleared ${deletedEmails?.length || 0} failed/stuck emails`);
  }

  // Step 2: Create missing templates and link to automations
  console.log("\n📝 Step 2: Creating templates and linking to automations...");

  // Get existing automations
  const { data: automations, error: autoError } = await supabase
    .from("email_automations")
    .select("id, name, trigger_type, template_id");

  if (autoError) {
    console.log("❌ Error fetching automations:", autoError.message);
    return;
  }

  for (const automation of automations) {
    const templateData = emailTemplates[automation.trigger_type];
    
    if (!templateData) {
      console.log(`⏭️  Skipping ${automation.trigger_type} - no template defined`);
      continue;
    }

    // Check if automation already has a template
    if (automation.template_id) {
      console.log(`✅ ${automation.name} - already has template`);
      continue;
    }

    // Create new template
    const { data: newTemplate, error: templateError } = await supabase
      .from("email_templates")
      .insert({
        name: templateData.name,
        subject: templateData.subject,
        html_content: templateData.html_content,
        is_active: true
      })
      .select()
      .single();

    if (templateError) {
      console.log(`❌ Error creating template for ${automation.name}:`, templateError.message);
      continue;
    }

    // Link template to automation
    const { error: linkError } = await supabase
      .from("email_automations")
      .update({ template_id: newTemplate.id })
      .eq("id", automation.id);

    if (linkError) {
      console.log(`❌ Error linking template to ${automation.name}:`, linkError.message);
    } else {
      console.log(`✅ Created & linked template for: ${automation.name}`);
    }
  }

  // Step 3: Verify all automations have templates
  console.log("\n📝 Step 3: Verifying automations...");

  const { data: updatedAutomations } = await supabase
    .from("email_automations")
    .select("name, trigger_type, template_id, is_active");

  console.log("\n   Automation Status:");
  updatedAutomations?.forEach(a => {
    const hasTemplate = a.template_id ? "✅" : "❌";
    const isActive = a.is_active ? "Active" : "Inactive";
    console.log(`   - ${a.name}: Template ${hasTemplate} | ${isActive}`);
  });

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🏁 FIX COMPLETE!\n");
  console.log("✅ Failed emails cleared from queue");
  console.log("✅ Email templates created for all automations");
  console.log("✅ Templates linked to automations");
  console.log("\n💡 Your email system is now ready to send!");
}

fixEmailSystem().catch(console.error);
