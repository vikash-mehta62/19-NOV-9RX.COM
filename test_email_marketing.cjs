/**
 * Email Marketing & Newsletter System Test
 * Tests: Templates, Campaigns, Automations, Subscribers, Newsletter
 * 
 * Run: node test_email_marketing.cjs
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

async function runTests() {
  console.log("\n🧪 EMAIL MARKETING & NEWSLETTER SYSTEM TEST\n");
  console.log("=".repeat(70));

  const results = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  // ============================================
  // TEST 1: Email Templates
  // ============================================
  console.log("\n📋 TEST 1: Email Templates");
  console.log("-".repeat(50));

  const { data: templates, error: templateError } = await supabase
    .from("email_templates")
    .select("id, name, subject, category, is_active, created_at")
    .order("created_at", { ascending: false });

  if (templateError) {
    console.log("❌ Error fetching templates:", templateError.message);
    results.failed++;
  } else {
    console.log(`✅ Found ${templates?.length || 0} email templates`);
    results.passed++;
    
    if (templates && templates.length > 0) {
      console.log("\n   Templates by category:");
      const byCategory = {};
      templates.forEach(t => {
        const cat = t.category || "uncategorized";
        byCategory[cat] = (byCategory[cat] || 0) + 1;
      });
      Object.entries(byCategory).forEach(([cat, count]) => {
        console.log(`   - ${cat}: ${count} template(s)`);
      });

      console.log("\n   Recent templates:");
      templates.slice(0, 5).forEach(t => {
        console.log(`   - ${t.name} (${t.is_active ? "✅ Active" : "❌ Inactive"})`);
        console.log(`     Subject: ${t.subject?.substring(0, 50)}...`);
      });
    } else {
      console.log("⚠️  No templates found - you should create some!");
      results.warnings++;
    }
  }

  // ============================================
  // TEST 2: Email Automations
  // ============================================
  console.log("\n📋 TEST 2: Email Automations");
  console.log("-".repeat(50));

  const { data: automations, error: autoError } = await supabase
    .from("email_automations")
    .select("id, name, trigger_type, is_active, template_id, total_sent, trigger_conditions")
    .order("created_at", { ascending: false });

  if (autoError) {
    console.log("❌ Error fetching automations:", autoError.message);
    results.failed++;
  } else {
    console.log(`✅ Found ${automations?.length || 0} automations`);
    results.passed++;

    if (automations && automations.length > 0) {
      console.log("\n   Automations:");
      automations.forEach(a => {
        const status = a.is_active ? "✅ Active" : "❌ Inactive";
        const hasTemplate = a.template_id ? "✅" : "⚠️ No template";
        console.log(`   - ${a.name} [${a.trigger_type}] ${status}`);
        console.log(`     Template: ${hasTemplate} | Sent: ${a.total_sent || 0}`);
        if (a.trigger_conditions) {
          console.log(`     Conditions: ${JSON.stringify(a.trigger_conditions)}`);
        }
      });

      // Check for common automation types
      const triggerTypes = automations.map(a => a.trigger_type);
      const expectedTypes = ["welcome", "abandoned_cart", "order_placed", "order_shipped"];
      console.log("\n   Automation coverage:");
      expectedTypes.forEach(type => {
        const exists = triggerTypes.includes(type);
        console.log(`   - ${type}: ${exists ? "✅ Configured" : "⚠️ Missing"}`);
        if (!exists) results.warnings++;
      });
    }
  }

  // ============================================
  // TEST 3: Email Campaigns
  // ============================================
  console.log("\n📋 TEST 3: Email Campaigns");
  console.log("-".repeat(50));

  const { data: campaigns, error: campError } = await supabase
    .from("email_campaigns")
    .select("id, name, subject, status, sent_count, open_count, click_count, created_at, scheduled_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (campError) {
    console.log("❌ Error fetching campaigns:", campError.message);
    results.failed++;
  } else {
    console.log(`✅ Found ${campaigns?.length || 0} campaigns`);
    results.passed++;

    if (campaigns && campaigns.length > 0) {
      console.log("\n   Recent campaigns:");
      campaigns.forEach(c => {
        const openRate = c.sent_count > 0 ? ((c.open_count / c.sent_count) * 100).toFixed(1) : 0;
        const clickRate = c.sent_count > 0 ? ((c.click_count / c.sent_count) * 100).toFixed(1) : 0;
        console.log(`   - ${c.name} [${c.status}]`);
        console.log(`     Sent: ${c.sent_count || 0} | Opens: ${openRate}% | Clicks: ${clickRate}%`);
      });
    }
  }

  // ============================================
  // TEST 4: Email Subscribers
  // ============================================
  console.log("\n📋 TEST 4: Email Subscribers");
  console.log("-".repeat(50));

  const { data: subscriberStats, error: subError } = await supabase
    .from("email_subscribers")
    .select("status", { count: "exact" });

  if (subError) {
    console.log("❌ Error fetching subscribers:", subError.message);
    results.failed++;
  } else {
    // Get counts by status
    const { data: activeCount } = await supabase
      .from("email_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const { data: unsubCount } = await supabase
      .from("email_subscribers")
      .select("*", { count: "exact", head: true })
      .eq("status", "unsubscribed");

    const { count: totalCount } = await supabase
      .from("email_subscribers")
      .select("*", { count: "exact", head: true });

    console.log(`✅ Subscriber statistics:`);
    console.log(`   - Total: ${totalCount || 0}`);
    console.log(`   - Active: ${activeCount?.length || 0}`);
    console.log(`   - Unsubscribed: ${unsubCount?.length || 0}`);
    results.passed++;
  }

  // ============================================
  // TEST 5: Newsletter Subscribers
  // ============================================
  console.log("\n📋 TEST 5: Newsletter Subscribers");
  console.log("-".repeat(50));

  const { count: newsletterCount, error: newsError } = await supabase
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true });

  if (newsError) {
    console.log("❌ Error fetching newsletter subscribers:", newsError.message);
    results.failed++;
  } else {
    console.log(`✅ Newsletter subscribers: ${newsletterCount || 0}`);
    results.passed++;

    // Get recent subscribers
    const { data: recentNews } = await supabase
      .from("newsletter_subscribers")
      .select("email, subscribed_at")
      .order("subscribed_at", { ascending: false })
      .limit(5);

    if (recentNews && recentNews.length > 0) {
      console.log("\n   Recent newsletter signups:");
      recentNews.forEach(n => {
        console.log(`   - ${n.email} (${new Date(n.subscribed_at).toLocaleDateString()})`);
      });
    }
  }

  // ============================================
  // TEST 6: Email Queue
  // ============================================
  console.log("\n📋 TEST 6: Email Queue Status");
  console.log("-".repeat(50));

  const { data: queueStats } = await supabase
    .from("email_queue")
    .select("status");

  if (queueStats) {
    const statusCounts = {};
    queueStats.forEach(q => {
      statusCounts[q.status] = (statusCounts[q.status] || 0) + 1;
    });

    console.log(`✅ Email queue status:`);
    console.log(`   - Pending: ${statusCounts.pending || 0}`);
    console.log(`   - Processing: ${statusCounts.processing || 0}`);
    console.log(`   - Sent: ${statusCounts.sent || 0}`);
    console.log(`   - Failed: ${statusCounts.failed || 0}`);
    results.passed++;

    if (statusCounts.failed > 0) {
      console.log("\n⚠️  There are failed emails in the queue!");
      results.warnings++;

      // Show recent failures
      const { data: failures } = await supabase
        .from("email_queue")
        .select("email, subject, error_message, created_at")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(3);

      if (failures) {
        console.log("   Recent failures:");
        failures.forEach(f => {
          console.log(`   - ${f.email}: ${f.error_message?.substring(0, 50)}...`);
        });
      }
    }
  }

  // ============================================
  // TEST 7: Email Logs
  // ============================================
  console.log("\n📋 TEST 7: Email Logs (Last 24 hours)");
  console.log("-".repeat(50));

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: recentLogs, error: logError } = await supabase
    .from("email_logs")
    .select("email_type, status")
    .gte("created_at", yesterday);

  if (logError) {
    console.log("❌ Error fetching logs:", logError.message);
    results.failed++;
  } else {
    const logStats = { sent: 0, failed: 0, byType: {} };
    recentLogs?.forEach(log => {
      if (log.status === "sent") logStats.sent++;
      else logStats.failed++;
      logStats.byType[log.email_type] = (logStats.byType[log.email_type] || 0) + 1;
    });

    console.log(`✅ Last 24 hours:`);
    console.log(`   - Total emails: ${recentLogs?.length || 0}`);
    console.log(`   - Sent: ${logStats.sent}`);
    console.log(`   - Failed: ${logStats.failed}`);
    
    if (Object.keys(logStats.byType).length > 0) {
      console.log("\n   By type:");
      Object.entries(logStats.byType).forEach(([type, count]) => {
        console.log(`   - ${type}: ${count}`);
      });
    }
    results.passed++;
  }

  // ============================================
  // TEST 8: Suppression List
  // ============================================
  console.log("\n📋 TEST 8: Email Suppression List");
  console.log("-".repeat(50));

  const { count: suppressedCount, error: suppError } = await supabase
    .from("email_suppression_list")
    .select("*", { count: "exact", head: true });

  if (suppError) {
    console.log("⚠️  Suppression list table may not exist:", suppError.message);
    results.warnings++;
  } else {
    console.log(`✅ Suppressed emails: ${suppressedCount || 0}`);
    results.passed++;
  }

  // ============================================
  // TEST 9: Mail Configuration
  // ============================================
  console.log("\n📋 TEST 9: Mail Configuration");
  console.log("-".repeat(50));

  const mailConfig = {
    MAIL_HOST: process.env.MAIL_HOST,
    MAIL_PORT: process.env.MAIL_PORT,
    MAIL_USER: process.env.MAIL_USER,
    MAIL_PASS: process.env.MAIL_PASS ? "****" : null,
  };

  let configValid = true;
  Object.entries(mailConfig).forEach(([key, value]) => {
    const status = value ? "✅" : "❌";
    console.log(`   ${key}: ${status} ${value || "NOT SET"}`);
    if (!value) configValid = false;
  });

  if (configValid) {
    console.log("\n✅ Mail configuration looks complete");
    results.passed++;
  } else {
    console.log("\n❌ Mail configuration incomplete - emails won't send!");
    results.failed++;
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n" + "=".repeat(70));
  console.log("🏁 TEST SUMMARY\n");
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ⚠️  Warnings: ${results.warnings}`);

  if (results.failed === 0) {
    console.log("\n🎉 All critical tests passed!");
  } else {
    console.log("\n⚠️  Some tests failed - review the output above.");
  }

  console.log("\n📝 RECOMMENDATIONS:");
  console.log("   1. Ensure all automation types have templates assigned");
  console.log("   2. Check failed emails in queue and fix issues");
  console.log("   3. Monitor open/click rates for campaigns");
  console.log("   4. Keep suppression list updated for bounces/complaints");
  console.log("");
}

runTests().catch(console.error);
