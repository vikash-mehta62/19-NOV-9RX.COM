/**
 * Test Script for Abandoned Cart Email System
 * Run: node test_abandoned_cart.cjs
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "./server/.env" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in server/.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTests() {
  console.log("\n🧪 ABANDONED CART EMAIL SYSTEM TEST\n");
  console.log("=".repeat(50));

  // Test 1: Check if carts table exists and has required columns
  console.log("\n📋 Test 1: Checking carts table structure...");
  const { data: cartSample, error: cartError } = await supabase
    .from("carts")
    .select("id, user_id, items, total, status, updated_at, abandoned_email_sent_at")
    .limit(1);

  if (cartError) {
    console.log("❌ Carts table error:", cartError.message);
  } else {
    console.log("✅ Carts table exists with required columns");
    console.log("   Sample cart:", cartSample?.length > 0 ? "Found" : "Empty");
  }

  // Test 2: Check if abandoned cart automation exists
  console.log("\n📋 Test 2: Checking abandoned cart automation...");
  const { data: automation, error: autoError } = await supabase
    .from("email_automations")
    .select("*")
    .eq("trigger_type", "abandoned_cart")
    .eq("is_active", true);

  if (autoError) {
    console.log("❌ Automation check error:", autoError.message);
  } else if (!automation || automation.length === 0) {
    console.log("⚠️  No active abandoned cart automation found!");
    console.log("   You need to create one in the admin panel or database.");
  } else {
    console.log("✅ Abandoned cart automation found:");
    automation.forEach(a => {
      console.log(`   - Name: ${a.name}`);
      console.log(`   - Template ID: ${a.template_id || "NOT SET ⚠️"}`);
      console.log(`   - Delay: ${a.trigger_conditions?.delay_hours || 1} hours`);
      console.log(`   - Min Cart Value: $${a.trigger_conditions?.min_cart_value || 0}`);
    });
  }

  // Test 3: Check if email template exists
  console.log("\n📋 Test 3: Checking email template...");
  if (automation && automation[0]?.template_id) {
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("id, name, subject, is_active")
      .eq("id", automation[0].template_id)
      .single();

    if (templateError || !template) {
      console.log("❌ Template not found for automation!");
    } else {
      console.log("✅ Email template found:");
      console.log(`   - Name: ${template.name}`);
      console.log(`   - Subject: ${template.subject}`);
      console.log(`   - Active: ${template.is_active}`);
    }
  } else {
    console.log("⚠️  No template_id set on automation - emails won't send!");
  }

  // Test 4: Find potential abandoned carts
  console.log("\n📋 Test 4: Finding potential abandoned carts...");
  const delayHours = automation?.[0]?.trigger_conditions?.delay_hours || 1;
  const cutoffTime = new Date(Date.now() - delayHours * 60 * 60 * 1000).toISOString();

  const { data: abandonedCarts, error: abandonedError } = await supabase
    .from("carts")
    .select(`
      id, user_id, total, status, updated_at, abandoned_email_sent_at,
      profiles!inner (email, first_name)
    `)
    .eq("status", "active")
    .lt("updated_at", cutoffTime)
    .is("abandoned_email_sent_at", null);

  if (abandonedError) {
    console.log("❌ Error finding abandoned carts:", abandonedError.message);
  } else if (!abandonedCarts || abandonedCarts.length === 0) {
    console.log("ℹ️  No abandoned carts found (older than", delayHours, "hours)");
    console.log("   This is normal if users are active or carts are new.");
  } else {
    console.log(`✅ Found ${abandonedCarts.length} abandoned cart(s):`);
    abandonedCarts.forEach(cart => {
      console.log(`   - Cart ID: ${cart.id}`);
      console.log(`     Email: ${cart.profiles?.email}`);
      console.log(`     Total: $${cart.total}`);
      console.log(`     Last Updated: ${cart.updated_at}`);
    });
  }

  // Test 5: Check email queue
  console.log("\n📋 Test 5: Checking email queue...");
  const { data: queuedEmails, error: queueError } = await supabase
    .from("email_queue")
    .select("id, email, subject, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (queueError) {
    console.log("❌ Email queue error:", queueError.message);
  } else {
    console.log(`✅ Recent emails in queue: ${queuedEmails?.length || 0}`);
    queuedEmails?.forEach(email => {
      console.log(`   - To: ${email.email}`);
      console.log(`     Subject: ${email.subject}`);
      console.log(`     Status: ${email.status}`);
    });
  }

  // Test 6: Check mail sender config
  console.log("\n📋 Test 6: Checking mail configuration...");
  const mailConfig = {
    MAIL_HOST: process.env.MAIL_HOST ? "✅ Set" : "❌ Missing",
    MAIL_USER: process.env.MAIL_USER ? "✅ Set" : "❌ Missing",
    MAIL_PASS: process.env.MAIL_PASS ? "✅ Set" : "❌ Missing",
  };
  console.log("   MAIL_HOST:", mailConfig.MAIL_HOST);
  console.log("   MAIL_USER:", mailConfig.MAIL_USER);
  console.log("   MAIL_PASS:", mailConfig.MAIL_PASS);

  console.log("\n" + "=".repeat(50));
  console.log("🏁 TEST COMPLETE\n");

  // Summary
  console.log("📝 SUMMARY:");
  console.log("   1. Make sure your server is running (node server/app.js)");
  console.log("   2. The cron checks abandoned carts every 5 minutes");
  console.log("   3. Carts must be inactive for", delayHours, "hour(s) to trigger email");
  console.log("   4. Check server logs for: '🛒 Found X abandoned carts'");
  console.log("\n💡 TIP: To test faster, temporarily change delay_hours to 0.01 (36 seconds)");
}

runTests().catch(console.error);
