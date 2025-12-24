/**
 * Debug Rewards System - Check reviews, referrals, and birthday bonuses
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "./server/.env" });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugRewards() {
  console.log("🔍 Debugging Rewards System");
  console.log("=".repeat(60));

  try {
    // 1. Check product_reviews table
    console.log("\n📋 1. Checking product_reviews table...");
    const { data: reviews, error: reviewsError } = await supabase
      .from("product_reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (reviewsError) {
      console.log("❌ product_reviews error:", reviewsError.message);
      console.log("   Code:", reviewsError.code);
      console.log("   Hint:", reviewsError.hint);
    } else if (reviews && reviews.length > 0) {
      console.log(`✅ Found ${reviews.length} reviews:`);
      reviews.forEach(r => {
        console.log(`   - ID: ${r.id}`);
        console.log(`     User: ${r.user_id}`);
        console.log(`     Product: ${r.product_id}`);
        console.log(`     Rating: ${r.rating}/5`);
        console.log(`     Points Awarded: ${r.points_awarded ? 'Yes' : 'No'}`);
        console.log(`     Created: ${r.created_at}`);
        console.log("");
      });
    } else {
      console.log("ℹ️ No reviews found in database");
    }

    // 2. Check referrals table
    console.log("\n📋 2. Checking referrals table...");
    const { data: referrals, error: referralsError } = await supabase
      .from("referrals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (referralsError) {
      console.log("❌ referrals error:", referralsError.message);
      console.log("   Code:", referralsError.code);
    } else if (referrals && referrals.length > 0) {
      console.log(`✅ Found ${referrals.length} referrals:`);
      referrals.forEach(r => {
        console.log(`   - Referrer: ${r.referrer_id}`);
        console.log(`     Referred: ${r.referred_id}`);
        console.log(`     Status: ${r.status}`);
        console.log(`     Points Awarded: ${r.points_awarded || 0}`);
        console.log("");
      });
    } else {
      console.log("ℹ️ No referrals found");
    }

    // 3. Check profiles with birthday set
    console.log("\n📋 3. Checking profiles with birthdays...");
    const { data: birthdayProfiles, error: bdError } = await supabase
      .from("profiles")
      .select("id, first_name, email, date_of_birth, birthday_bonus_year, reward_points")
      .not("date_of_birth", "is", null)
      .limit(10);

    if (bdError) {
      console.log("❌ Birthday profiles error:", bdError.message);
    } else if (birthdayProfiles && birthdayProfiles.length > 0) {
      console.log(`✅ Found ${birthdayProfiles.length} profiles with birthdays:`);
      birthdayProfiles.forEach(p => {
        console.log(`   - ${p.first_name || p.email}: DOB ${p.date_of_birth}`);
        console.log(`     Bonus Year: ${p.birthday_bonus_year || 'Never'}`);
        console.log(`     Current Points: ${p.reward_points || 0}`);
      });
    } else {
      console.log("ℹ️ No profiles have birthday set");
    }

    // 4. Check reward_transactions for bonus types
    console.log("\n📋 4. Checking bonus transactions...");
    const { data: bonusTrans, error: bonusError } = await supabase
      .from("reward_transactions")
      .select("*")
      .eq("transaction_type", "bonus")
      .order("created_at", { ascending: false })
      .limit(10);

    if (bonusError) {
      console.log("❌ Bonus transactions error:", bonusError.message);
    } else if (bonusTrans && bonusTrans.length > 0) {
      console.log(`✅ Found ${bonusTrans.length} bonus transactions:`);
      bonusTrans.forEach(t => {
        console.log(`   - +${t.points} pts: ${t.description}`);
        console.log(`     Type: ${t.reference_type || 'N/A'}`);
        console.log(`     User: ${t.user_id}`);
        console.log(`     Date: ${t.created_at}`);
        console.log("");
      });
    } else {
      console.log("ℹ️ No bonus transactions found");
    }

    // 5. Check review_helpful table
    console.log("\n📋 5. Checking review_helpful table...");
    const { data: helpful, error: helpfulError } = await supabase
      .from("review_helpful")
      .select("*")
      .limit(5);

    if (helpfulError) {
      console.log("❌ review_helpful error:", helpfulError.message);
      console.log("   Code:", helpfulError.code);
    } else {
      console.log(`✅ review_helpful table exists (${helpful?.length || 0} records)`);
    }

    // 6. Check a specific user's reward status
    console.log("\n📋 6. Checking pharmacy users with rewards...");
    const { data: pharmacyUsers, error: puError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, reward_points, lifetime_reward_points, reward_tier, referral_code")
      .eq("role", "pharmacy")
      .order("reward_points", { ascending: false })
      .limit(5);

    if (puError) {
      console.log("❌ Pharmacy users error:", puError.message);
    } else if (pharmacyUsers && pharmacyUsers.length > 0) {
      console.log(`✅ Top pharmacy users by points:`);
      pharmacyUsers.forEach(u => {
        console.log(`   - ${u.first_name || ''} ${u.last_name || ''} (${u.email})`);
        console.log(`     Points: ${u.reward_points || 0} | Lifetime: ${u.lifetime_reward_points || 0}`);
        console.log(`     Tier: ${u.reward_tier || 'Bronze'} | Referral Code: ${u.referral_code || 'None'}`);
        console.log("");
      });
    }

    console.log("\n" + "=".repeat(60));
    console.log("🔍 Debug Complete!");

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

debugRewards();
