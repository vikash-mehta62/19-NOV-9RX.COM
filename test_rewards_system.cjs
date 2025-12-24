/**
 * Test Rewards System Configuration
 * Verifies that the rewards system is properly set up
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "./server/.env" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRewardsSystem() {
  console.log("🧪 Testing Rewards System Configuration");
  console.log("=".repeat(50));

  try {
    // 1. Check rewards_config
    console.log("\n📋 1. Checking rewards_config...");
    const { data: config, error: configError } = await supabase
      .from("rewards_config")
      .select("*")
      .limit(1)
      .single();

    if (configError) {
      console.log("❌ rewards_config error:", configError.message);
    } else if (config) {
      console.log("✅ Rewards Config Found:");
      console.log(`   - Program Enabled: ${config.program_enabled}`);
      console.log(`   - Points per Dollar: ${config.points_per_dollar}`);
      console.log(`   - Referral Bonus: ${config.referral_bonus} points`);
      console.log(`   - Review Bonus: ${config.review_bonus} points`);
      console.log(`   - Birthday Bonus: ${config.birthday_bonus} points`);
    } else {
      console.log("⚠️ No rewards config found - creating default...");
      await supabase.from("rewards_config").insert({
        program_enabled: true,
        points_per_dollar: 1,
        referral_bonus: 200,
        review_bonus: 50,
        birthday_bonus: 100
      });
      console.log("✅ Default config created");
    }

    // 2. Check reward_tiers
    console.log("\n📋 2. Checking reward_tiers...");
    const { data: tiers, error: tiersError } = await supabase
      .from("reward_tiers")
      .select("*")
      .order("min_points", { ascending: true });

    if (tiersError) {
      console.log("❌ reward_tiers error:", tiersError.message);
    } else if (tiers && tiers.length > 0) {
      console.log(`✅ Found ${tiers.length} reward tiers:`);
      tiers.forEach(tier => {
        console.log(`   - ${tier.name}: ${tier.min_points}+ points (${tier.multiplier}x multiplier)`);
      });
    } else {
      console.log("⚠️ No reward tiers found");
    }

    // 3. Check reward_transactions table
    console.log("\n📋 3. Checking reward_transactions...");
    const { count: transCount, error: transError } = await supabase
      .from("reward_transactions")
      .select("*", { count: "exact", head: true });

    if (transError) {
      console.log("❌ reward_transactions error:", transError.message);
    } else {
      console.log(`✅ reward_transactions table exists (${transCount || 0} records)`);
    }

    // 4. Check profiles have reward columns
    console.log("\n📋 4. Checking profiles reward columns...");
    const { data: sampleProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, reward_points, lifetime_reward_points, reward_tier, referral_code, date_of_birth")
      .limit(1)
      .single();

    if (profileError) {
      console.log("❌ profiles error:", profileError.message);
    } else if (sampleProfile) {
      console.log("✅ Profile reward columns exist:");
      console.log(`   - reward_points: ${sampleProfile.reward_points || 0}`);
      console.log(`   - lifetime_reward_points: ${sampleProfile.lifetime_reward_points || 0}`);
      console.log(`   - reward_tier: ${sampleProfile.reward_tier || 'Bronze'}`);
      console.log(`   - referral_code: ${sampleProfile.referral_code || 'Not set'}`);
      console.log(`   - date_of_birth: ${sampleProfile.date_of_birth || 'Not set'}`);
    }

    // 5. Check recent reward transactions
    console.log("\n📋 5. Recent Reward Transactions...");
    const { data: recentTrans, error: recentError } = await supabase
      .from("reward_transactions")
      .select("id, points, transaction_type, description, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentError) {
      console.log("❌ Error fetching transactions:", recentError.message);
    } else if (recentTrans && recentTrans.length > 0) {
      console.log(`✅ Last ${recentTrans.length} transactions:`);
      recentTrans.forEach(t => {
        const sign = t.points > 0 ? '+' : '';
        console.log(`   ${sign}${t.points} pts - ${t.description} (${t.transaction_type})`);
      });
    } else {
      console.log("ℹ️ No reward transactions yet");
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ Rewards System Check Complete!");
    console.log("\n📝 How Reward Points Work:");
    console.log("   1. Points are awarded when an order is CREATED (not shipped)");
    console.log("   2. Credit orders do NOT earn points until paid");
    console.log("   3. Points = Order Total × Points per Dollar × Tier Multiplier");
    console.log("   4. Referral bonus: Both users get points on first order");
    console.log("   5. Review bonus: Points awarded when review is submitted");
    console.log("   6. Birthday bonus: Annual bonus on user's birthday");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testRewardsSystem();
