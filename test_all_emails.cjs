/**
 * Test All Email Templates
 * Sends all email templates to a test email address
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "./server/.env" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_EMAIL = "palakchoudhary52@gmail.com";
const TEST_USER = {
  first_name: "Palak",
  last_name: "Choudhary",
  company_name: "Test Company"
};

async function testAllEmails() {
  console.log("🧪 Testing All Email Templates");
  console.log("📧 Target Email:", TEST_EMAIL);
  console.log("=".repeat(50));

  try {
    // Get all active templates
    const { data: templates, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) throw error;

    if (!templates || templates.length === 0) {
      console.log("❌ No active email templates found!");
      return;
    }

    console.log(`\n📋 Found ${templates.length} active templates:\n`);

    // Sample data for different template types
    const sampleData = {
      // Order related
      order_id: "ORD-2024-TEST001",
      order_number: "ORD-2024-TEST001",
      order_total: "1,250.00",
      order_date: new Date().toLocaleDateString(),
      order_items: `
        <div style="border-bottom:1px solid #eee; padding:10px 0;">
          <strong>Amoxicillin 500mg</strong>
          <div style="color:#666; font-size:14px;">Qty: 5 × $45.00</div>
        </div>
        <div style="border-bottom:1px solid #eee; padding:10px 0;">
          <strong>Ibuprofen 200mg</strong>
          <div style="color:#666; font-size:14px;">Qty: 10 × $25.00</div>
        </div>
      `,
      
      // Shipping related
      tracking_number: "1Z999AA10123456784",
      carrier: "UPS",
      estimated_delivery: "December 27, 2024",
      shipping_address: "123 Test Street, New York, NY 10001",
      
      // Cart related
      cart_items: `
        <div style="border-bottom:1px solid #eee; padding:10px 0;">
          <strong>Vitamin D3 5000IU</strong>
          <div style="color:#666; font-size:14px;">Qty: 2 × $35.00</div>
        </div>
        <div style="border-bottom:1px solid #eee; padding:10px 0;">
          <strong>Omega-3 Fish Oil</strong>
          <div style="color:#666; font-size:14px;">Qty: 1 × $55.00</div>
        </div>
      `,
      cart_total: "125.00",
      cart_url: "https://9rx.com/pharmacy/order/create",
      item_count: "3",
      
      // User related
      user_name: `${TEST_USER.first_name} ${TEST_USER.last_name}`,
      first_name: TEST_USER.first_name,
      last_name: TEST_USER.last_name,
      email: TEST_EMAIL,
      
      // Feedback
      feedback_url: "https://9rx.com/feedback",
      review_url: "https://9rx.com/review",
      
      // General
      unsubscribe_url: "https://9rx.com/unsubscribe",
      company_name: "9RX",
      current_year: new Date().getFullYear().toString(),
      support_email: "support@9rx.com",
      website_url: "https://9rx.com"
    };

    // Queue each template
    let queued = 0;
    for (const template of templates) {
      console.log(`\n📨 Template: ${template.name}`);
      console.log(`   Type: ${template.template_type || 'general'}`);
      console.log(`   Subject: ${template.subject}`);

      // Replace variables in subject and content
      let subject = template.subject;
      let htmlContent = template.html_content;

      // Replace all variables
      for (const [key, value] of Object.entries(sampleData)) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
        subject = subject.replace(regex, value);
        htmlContent = htmlContent.replace(regex, value);
      }

      // Queue the email
      const { error: queueError } = await supabase
        .from("email_queue")
        .insert({
          email: TEST_EMAIL,
          subject: `[TEST] ${subject}`,
          html_content: htmlContent,
          text_content: template.text_content || null,
          template_id: template.id,
          status: "pending",
          priority: 10, // High priority for test
          scheduled_at: new Date().toISOString(),
          metadata: {
            test_mode: true,
            template_name: template.name,
            ...sampleData
          }
        });

      if (queueError) {
        console.log(`   ❌ Failed to queue: ${queueError.message}`);
      } else {
        console.log(`   ✅ Queued successfully`);
        queued++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`\n✅ Queued ${queued}/${templates.length} emails to ${TEST_EMAIL}`);
    
    // Check queue status
    const { data: queuedEmails } = await supabase
      .from("email_queue")
      .select("id, subject, status")
      .eq("email", TEST_EMAIL)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    if (queuedEmails && queuedEmails.length > 0) {
      console.log(`\n📬 Pending emails in queue:`);
      queuedEmails.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.subject}`);
      });
    }

    console.log("\n⚠️  IMPORTANT: To actually send these emails:");
    console.log("   1. Update server/.env with real Gmail credentials:");
    console.log("      MAIL_USER=your-real-email@gmail.com");
    console.log("      MAIL_PASS=your-app-password");
    console.log("   2. Start the server: cd server && node app.js");
    console.log("   3. The email cron will process the queue every 30 seconds");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testAllEmails();
