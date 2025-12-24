import { supabase } from "@/integrations/supabase/client"

interface ReferralStats {
  referralCode: string
  referralCount: number
  pendingReferrals: number
  completedReferrals: number
  totalPointsEarned: number
}

// Get user's referral code (generate if doesn't exist)
export async function getUserReferralCode(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", userId)
    .maybeSingle()

  if (error || !data?.referral_code) {
    // Generate a new code if doesn't exist
    const newCode = generateReferralCode()
    await supabase
      .from("profiles")
      .update({ referral_code: newCode })
      .eq("id", userId)
    return newCode
  }

  return data.referral_code
}

// Generate a random referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Apply referral code during signup (uses RPC to bypass RLS)
export async function applyReferralCode(
  newUserId: string, 
  referralCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Use RPC function to apply referral (bypasses RLS, works without login)
    const { data, error } = await supabase.rpc('apply_referral_code', {
      p_new_user_id: newUserId,
      p_referral_code: referralCode.trim()
    })

    if (error) {
      console.error("RPC apply_referral_code error:", error)
      // Fallback to direct method
      return await fallbackApplyReferralCode(newUserId, referralCode)
    }

    console.log("Referral RPC response:", data)
    return { 
      success: data?.success || false, 
      message: data?.message || "Referral code applied" 
    }
  } catch (error) {
    console.error("Error applying referral code:", error)
    return { success: false, message: "Failed to apply referral code" }
  }
}

// Fallback method if RPC doesn't exist
async function fallbackApplyReferralCode(
  newUserId: string, 
  referralCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Find the referrer by code
    const { data: referrer, error: findError } = await supabase
      .from("profiles")
      .select("id, first_name, company_name")
      .eq("referral_code", referralCode.toUpperCase())
      .maybeSingle()

    if (findError || !referrer) {
      return { success: false, message: "Invalid referral code" }
    }

    // Can't refer yourself
    if (referrer.id === newUserId) {
      return { success: false, message: "You cannot use your own referral code" }
    }

    // Check if user was already referred
    const { data: existingReferral } = await supabase
      .from("referrals")
      .select("id")
      .eq("referred_id", newUserId)
      .maybeSingle()

    if (existingReferral) {
      return { success: false, message: "You have already used a referral code" }
    }

    // Update the new user's profile with referrer info
    await supabase
      .from("profiles")
      .update({ referred_by: referrer.id })
      .eq("id", newUserId)

    // Create referral record (pending until first order)
    await supabase
      .from("referrals")
      .insert({
        referrer_id: referrer.id,
        referred_id: newUserId,
        status: "pending"
      })

    const referrerName = referrer.first_name || referrer.company_name || "Your friend"
    return { 
      success: true, 
      message: `Referral from ${referrerName} applied! You'll both earn bonus points on your first order.` 
    }
  } catch (error) {
    console.error("Fallback referral error:", error)
    return { success: false, message: "Failed to apply referral code" }
  }
}

// Complete referral and award points (called after first order) - uses RPC
export async function completeReferral(
  userId: string, 
  orderId: string
): Promise<{ success: boolean; pointsAwarded: number }> {
  try {
    // Use RPC function to complete referral (bypasses RLS)
    const { data, error } = await supabase.rpc('complete_referral', {
      p_user_id: userId,
      p_order_id: orderId
    })

    if (error) {
      console.error("RPC complete_referral error:", error)
      // Fallback to direct method
      return await fallbackCompleteReferral(userId, orderId)
    }

    console.log("Complete referral RPC response:", data)
    
    if (data?.success) {
      return { success: true, pointsAwarded: data.total_awarded || 0 }
    }
    
    return { success: false, pointsAwarded: 0 }
  } catch (error) {
    console.error("Error completing referral:", error)
    return { success: false, pointsAwarded: 0 }
  }
}

// Fallback method if RPC doesn't exist
async function fallbackCompleteReferral(
  userId: string, 
  orderId: string
): Promise<{ success: boolean; pointsAwarded: number }> {
  try {
    // Get rewards config for bonus amount
    const { data: config } = await supabase
      .from("rewards_config")
      .select("referral_bonus")
      .maybeSingle()

    const referralBonus = config?.referral_bonus || 200

    // Find pending referral for this user
    const { data: referral, error: findError } = await supabase
      .from("referrals")
      .select("*, referrer:referrer_id(id, reward_points, email, first_name, referral_count)")
      .eq("referred_id", userId)
      .eq("status", "pending")
      .maybeSingle()

    if (findError || !referral) {
      return { success: false, pointsAwarded: 0 }
    }

    // Update referral status
    await supabase
      .from("referrals")
      .update({
        status: "completed",
        points_awarded: referralBonus,
        first_order_id: orderId,
        completed_at: new Date().toISOString()
      })
      .eq("id", referral.id)

    // Award points to referrer
    const referrerData = referral.referrer as any
    if (referrerData) {
      const newPoints = (referrerData.reward_points || 0) + referralBonus
      const newCount = (referrerData.referral_count || 0) + 1

      await supabase
        .from("profiles")
        .update({ 
          reward_points: newPoints,
          lifetime_reward_points: newPoints,
          referral_count: newCount
        })
        .eq("id", referrerData.id)

      // Log transaction for referrer
      await supabase
        .from("reward_transactions")
        .insert({
          user_id: referrerData.id,
          points: referralBonus,
          transaction_type: "bonus",
          description: "Referral bonus - friend made first purchase",
          reference_type: "referral",
          reference_id: referral.id
        })
    }

    // Award points to referred user too
    const { data: referredUser } = await supabase
      .from("profiles")
      .select("reward_points, lifetime_reward_points")
      .eq("id", userId)
      .maybeSingle()

    if (referredUser) {
      await supabase
        .from("profiles")
        .update({ 
          reward_points: (referredUser.reward_points || 0) + referralBonus,
          lifetime_reward_points: (referredUser.lifetime_reward_points || 0) + referralBonus
        })
        .eq("id", userId)

      // Log transaction for referred user
      await supabase
        .from("reward_transactions")
        .insert({
          user_id: userId,
          points: referralBonus,
          transaction_type: "bonus",
          description: "Welcome bonus - referred by a friend",
          reference_type: "referral",
          reference_id: referral.id
          })
    }

    return { success: true, pointsAwarded: referralBonus * 2 }
  } catch (error) {
    console.error("Fallback complete referral error:", error)
    return { success: false, pointsAwarded: 0 }
  }
}

// Get user's referral statistics
export async function getReferralStats(userId: string): Promise<ReferralStats | null> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, referral_count")
      .eq("id", userId)
      .maybeSingle()

    const { data: referrals } = await supabase
      .from("referrals")
      .select("status, points_awarded")
      .eq("referrer_id", userId)

    const pendingReferrals = referrals?.filter(r => r.status === "pending").length || 0
    const completedReferrals = referrals?.filter(r => r.status === "completed").length || 0
    const totalPointsEarned = referrals?.reduce((sum, r) => sum + (r.points_awarded || 0), 0) || 0

    return {
      referralCode: profile?.referral_code || "",
      referralCount: profile?.referral_count || 0,
      pendingReferrals,
      completedReferrals,
      totalPointsEarned
    }
  } catch (error) {
    console.error("Error getting referral stats:", error)
    return null
  }
}

// Validate referral code exists
export async function validateReferralCode(code: string): Promise<{ valid: boolean; referrerName?: string }> {
  if (!code || code.trim() === '') {
    return { valid: false }
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, company_name")
    .eq("referral_code", code.toUpperCase())
    .maybeSingle()

  if (error || !data) {
    return { valid: false }
  }

  return { 
    valid: true, 
    referrerName: data.first_name || data.company_name || "A friend" 
  }
}

export default {
  getUserReferralCode,
  applyReferralCode,
  completeReferral,
  getReferralStats,
  validateReferralCode
}
