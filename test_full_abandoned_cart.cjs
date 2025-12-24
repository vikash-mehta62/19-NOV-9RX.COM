/**
 * Full Test Script for Abandoned Cart Email System
 * This will:
 * 1. Update automation to fast settings (36 seconds delay)
 * 2. Create a test cart that's "old"
 * 3. Trigger the abandoned cart check
 * 4. Show results
 * 
 * Run: node test_full_abandoned_cart.cjs
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "./server/.env" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runFullTest() {
  console.log("\n🧪 FULL ABANDONED CART EMAIL TEST\n");
  console.log("=".repeat(60));

  // Step 1: Update automation to fast settings
  console.log("\n📝 Step 1: Updating automation to fast test settings...");
  
  const { data: automation, error: autoError } = await supabase
    .from("email_automations")
    .update({
      trigger_conditions: { delay_hours: 0.01, min_cart_value: 0 },
      is_active: true
    })
    .eq("trigger_type", "abandoned_cart")
    .select()
    .single();

  if (autoError) {
    console.log("❌ Error updating automation:", autoError.message);
    return;
  }
  console.log("✅ Automation updated:");
  console.log("   - Delay: 0.01 hours (~36 seconds)");
  console.log("   - Min Cart Value: $0");

  // Step 2: Find a user with email to test
  console.log("\n📝 Step 2: Finding a test user...");
  
  const { data: testUser, error: userError } = await supabase
    .from("profiles")
    .select("id, email, first_name")
    .not("email", "is", null)
    .limit(1)
    .single();

  if (userError || !testUser) {
    console.log("❌ No user found with email:", userError?.message);
    return;
  }
  console.log("✅ Test user found:");
  console.log("   - Email:", testUser.email);
  console.log("   - Name:", testUser.first_name || "N/A");

  // Step 3: Create or update a test cart that's "old"
  console.log("\n📝 Step 3: Creating/updating test cart...");
  
  // Make the cart 2 minutes old (older than 36 seconds delay)
  const oldTime = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  
  const testCartData = {
    user_id: testUser.id,
    items: [
      { 
        productId: "test-product-1",
        name: "Test Medical Supply",
        price: 55.96,
        quantity: 2,
        image: "/placeholder.svg"
      }
    ],
    total: 111.92,
    status: "active",
    updated_at: oldTime,
    abandoned_email_sent_at: null // Reset so email can be sent
  };

  // Check if cart exists
  const { data: existingCart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", testUser.id)
    .eq("status", "active")
    .maybeSingle();

  let cartId;
  if (existingCart) {
    // Update existing cart
    const { data: updatedCart, error: updateError } = await supabase
      .from("carts")
      .update(testCartData)
      .eq("id", existingCart.id)
      .select()
      .single();
    
    if (updateError) {
      console.log("❌ Error updating cart:", updateError.message);
      return;
    }
    cartId = updatedCart.id;
    console.log("✅ Existing cart updated to be 'old'");
  } else {
    // Create new cart
    const { data: newCart, error: insertError } = await supabase
      .from("carts")
      .insert(testCartData)
      .select()
      .single();
    
    if (insertError) {
      console.log("❌ Error creating cart:", insertError.message);
      return;
    }
    cartId = newCart.id;
    console.log("✅ New test cart created");
  }
  
  console.log("   - Cart ID:", cartId);
  console.log("   - Total: $111.92");
  console.log("   - Updated at:", oldTime, "(2 minutes ago)");

  // Step 4: Wait a moment then check for abandoned carts
  console.log("\n📝 Step 4: Checking for abandoned carts...");
  console.log("   (Delay is 36 seconds, cart is 2 minutes old - should be detected)");
  
  const delayHours = 0.01;
  const cutoffTime = new Date(Date.now() - delayHours * 60 * 60 * 1000).toISOString();

  const { data: abandonedCarts, error: abandonedError } = await supabase
    .from("carts")
    .select(`
      id, user_id, total, status, updated_at, abandoned_email_sent_at,
      profiles!inner (email, first_name, last_name)
    `)
    .eq("status", "active")
    .lt("updated_at", cutoffTime)
    .is("abandoned_email_sent_at", null);

  if (abandonedError) {
    console.log("❌ Error:", abandonedError.message);
    return;
  }

  if (!abandonedCarts || abandonedCarts.length === 0) {
    console.log("⚠️  No abandoned carts found. This shouldn't happen...");
    return;
  }

  console.log(`✅ Found ${abandonedCarts.length} abandoned cart(s)!`);
  abandonedCarts.forEach(cart => {
    console.log(`   - Cart: ${cart.id}`);
    console.log(`     Email: ${cart.profiles?.email}`);
    console.log(`     Total: $${cart.total}`);
  });

  // Step 5: Manually trigger email queue (simulating what cron does)
  console.log("\n📝 Step 5: Queueing abandoned cart email...");
  
  const cart = abandonedCarts[0];
  const profile = cart.profiles;
  
  // Get template
  const { data: template } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", automation.template_id)
    .single();

  if (!template) {
    console.log("❌ Email template not found!");
    return;
  }

  // Simple variable replacement
  let htmlContent = template.html_content || "";
  let subject = template.subject || "You left something behind!";
  
  const variables = {
    user_name: profile.first_name || "Customer",
    first_name: profile.first_name || "",
    cart_total: cart.total?.toFixed(2) || "0.00",
    cart_url: "https://9rx.com/pharmacy/order/create"
  };

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    htmlContent = htmlContent.replace(regex, value);
    subject = subject.replace(regex, value);
  });

  // Queue the email
  const { data: queuedEmail, error: queueError } = await supabase
    .from("email_queue")
    .insert({
      email: profile.email,
      subject: subject,
      html_content: htmlContent,
      automation_id: automation.id,
      template_id: automation.template_id,
      status: "pending",
      priority: 5,
      scheduled_at: new Date().toISOString(),
      metadata: {
        user_id: cart.user_id,
        cart_id: cart.id,
        trigger_type: "abandoned_cart",
        first_name: profile.first_name
      }
    })
    .select()
    .single();

  if (queueError) {
    console.log("❌ Error queueing email:", queueError.message);
    return;
  }

  console.log("✅ Email queued successfully!");
  console.log("   - Queue ID:", queuedEmail.id);
  console.log("   - To:", profile.email);
  console.log("   - Subject:", subject);

  // Mark cart as email sent
  await supabase
    .from("carts")
    .update({ abandoned_email_sent_at: new Date().toISOString() })
    .eq("id", cart.id);

  console.log("✅ Cart marked as email sent");

  // Step 6: Check email queue
  console.log("\n📝 Step 6: Checking email queue...");
  
  const { data: pendingEmails } = await supabase
    .from("email_queue")
    .select("id, email, subject, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log(`✅ Pending emails in queue: ${pendingEmails?.length || 0}`);
  pendingEmails?.forEach(email => {
    console.log(`   - To: ${email.email}`);
    console.log(`     Subject: ${email.subject}`);
    console.log(`     Status: ${email.status}`);
  });

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🏁 TEST COMPLETE!\n");
  console.log("📧 WHAT HAPPENS NEXT:");
  console.log("   1. The server's email cron runs every 30 seconds");
  console.log("   2. It will pick up the pending email from the queue");
  console.log("   3. It will send the email via your SMTP settings");
  console.log("   4. Check server logs for: '✅ Queue processed: X sent'");
  console.log("\n⚠️  NOTE: Make sure your MAIL_USER and MAIL_PASS in server/.env");
  console.log("   are real Gmail credentials (use App Password, not regular password)");
  console.log("\n💡 To see the email being sent, watch the server output!");
}

runFullTest().catch(console.error);
