import { supabase } from "@/integrations/supabase/client"

interface RewardsConfig {
  program_enabled: boolean
  points_per_dollar: number
  referral_bonus: number
  review_bonus: number
  birthday_bonus: number
}

interface RewardTier {
  id: string
  name: string
  min_points: number
  color: string
  benefits: string[]
  multiplier: number
}

// Get rewards configuration
export async function getRewardsConfig(): Promise<RewardsConfig | null> {
  const { data } = await supabase
    .from("rewards_config")
    .select("*")
    .limit(1)
    .single()
  return data
}

// Get all reward tiers
export async function getRewardTiers(): Promise<RewardTier[]> {
  const { data } = await supabase
    .from("reward_tiers")
    .select("*")
    .order("min_points", { ascending: true })
  return data || []
}

// Get user's current tier based on points
export function getUserTier(points: number, tiers: RewardTier[]): RewardTier {
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (points >= tiers[i].min_points) return tiers[i]
  }
  return tiers[0] || { id: "1", name: "Bronze", min_points: 0, color: "bg-amber-600", benefits: [], multiplier: 1 }
}

// Get next tier for user
export function getNextTier(currentPoints: number, tiers: RewardTier[]): RewardTier | null {
  for (const tier of tiers) {
    if (tier.min_points > currentPoints) return tier
  }
  return null // Already at highest tier
}

// Calculate points to earn from order
export async function calculateOrderPoints(orderTotal: number, userId: string): Promise<number> {
  const config = await getRewardsConfig()
  if (!config?.program_enabled) return 0

  const tiers = await getRewardTiers()
  
  // Get user's current points to determine tier multiplier
  const { data: user } = await supabase
    .from("profiles")
    .select("reward_points")
    .eq("id", userId)
    .single()

  const currentPoints = user?.reward_points || 0
  const currentTier = getUserTier(currentPoints, tiers)
  
  // Calculate base points (points per dollar * order total)
  const basePoints = Math.floor(orderTotal * config.points_per_dollar)
  
  // Apply tier multiplier
  const earnedPoints = Math.floor(basePoints * currentTier.multiplier)
  
  return earnedPoints
}

// Award points to user after order completion
export async function awardOrderPoints(
  userId: string,
  orderId: string,
  orderTotal: number,
  orderNumber: string
): Promise<{
  success: boolean
  pointsEarned: number
  newTotal: number
  oldTier: RewardTier
  newTier: RewardTier
  nextTier: RewardTier | null
  pointsToNextTier: number
  tierUpgrade: boolean
}> {
  try {
    const config = await getRewardsConfig()
    if (!config?.program_enabled) {
      return {
        success: false,
        pointsEarned: 0,
        newTotal: 0,
        oldTier: { id: "1", name: "Bronze", min_points: 0, color: "bg-amber-600", benefits: [], multiplier: 1 },
        newTier: { id: "1", name: "Bronze", min_points: 0, color: "bg-amber-600", benefits: [], multiplier: 1 },
        nextTier: null,
        pointsToNextTier: 0,
        tierUpgrade: false
      }
    }

    const tiers = await getRewardTiers()
    
    // Get user's current points
    const { data: user } = await supabase
      .from("profiles")
      .select("reward_points, lifetime_reward_points, email, first_name, last_name, company_name")
      .eq("id", userId)
      .single()

    if (!user) throw new Error("User not found")

    const currentPoints = user.reward_points || 0
    const oldTier = getUserTier(currentPoints, tiers)
    
    // Calculate points earned
    const basePoints = Math.floor(orderTotal * config.points_per_dollar)
    const pointsEarned = Math.floor(basePoints * oldTier.multiplier)
    
    const newTotal = currentPoints + pointsEarned
    const newTier = getUserTier(newTotal, tiers)
    const nextTier = getNextTier(newTotal, tiers)
    const pointsToNextTier = nextTier ? nextTier.min_points - newTotal : 0
    const tierUpgrade = newTier.name !== oldTier.name

    // Update user's points
    await supabase
      .from("profiles")
      .update({
        reward_points: newTotal,
        lifetime_reward_points: (user.lifetime_reward_points || 0) + pointsEarned,
        reward_tier: newTier.name
      })
      .eq("id", userId)

    // Log the transaction
    await supabase
      .from("reward_transactions")
      .insert({
        user_id: userId,
        points: pointsEarned,
        transaction_type: "earn",
        description: `Earned from order #${orderNumber}`,
        reference_type: "order",
        reference_id: orderId
      })

    // Queue reward email
    await queueRewardEmail(userId, {
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      companyName: user.company_name,
      orderNumber,
      orderTotal,
      pointsEarned,
      newTotal,
      oldTier,
      newTier,
      nextTier,
      pointsToNextTier,
      tierUpgrade,
      multiplier: oldTier.multiplier
    })

    return {
      success: true,
      pointsEarned,
      newTotal,
      oldTier,
      newTier,
      nextTier,
      pointsToNextTier,
      tierUpgrade
    }
  } catch (error) {
    console.error("Error awarding points:", error)
    return {
      success: false,
      pointsEarned: 0,
      newTotal: 0,
      oldTier: { id: "1", name: "Bronze", min_points: 0, color: "bg-amber-600", benefits: [], multiplier: 1 },
      newTier: { id: "1", name: "Bronze", min_points: 0, color: "bg-amber-600", benefits: [], multiplier: 1 },
      nextTier: null,
      pointsToNextTier: 0,
      tierUpgrade: false
    }
  }
}

// Queue reward notification email
async function queueRewardEmail(userId: string, data: {
  email: string
  firstName: string
  lastName: string
  companyName: string | null
  orderNumber: string
  orderTotal: number
  pointsEarned: number
  newTotal: number
  oldTier: RewardTier
  newTier: RewardTier
  nextTier: RewardTier | null
  pointsToNextTier: number
  tierUpgrade: boolean
  multiplier: number
}) {
  const customerName = data.firstName || data.companyName || "Valued Customer"
  
  // Build email content
  let subject = `🎉 You earned ${data.pointsEarned} reward points!`
  if (data.tierUpgrade) {
    subject = `🏆 Congratulations! You've reached ${data.newTier.name} status!`
  }

  const tierBadgeColor = data.newTier.color.replace("bg-", "")
  
  let nextTierMessage = ""
  if (data.nextTier) {
    nextTierMessage = `
      <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-radius: 12px; padding: 20px; margin-top: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #0369a1; font-size: 16px;">🚀 Next Goal: ${data.nextTier.name} Status</h3>
        <p style="margin: 0; color: #475569;">You're only <strong>${data.pointsToNextTier.toLocaleString()} points</strong> away from ${data.nextTier.name}!</p>
        <div style="background: #e2e8f0; border-radius: 10px; height: 10px; margin-top: 15px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #10b981, #059669); height: 100%; width: ${Math.min(100, ((data.newTotal - data.oldTier.min_points) / (data.nextTier.min_points - data.oldTier.min_points)) * 100)}%; border-radius: 10px;"></div>
        </div>
        <p style="margin: 10px 0 0 0; color: #64748b; font-size: 13px;">
          ${data.nextTier.name} benefits: ${data.nextTier.benefits?.join(", ") || "Exclusive perks"}
        </p>
      </div>
    `
  }

  let tierUpgradeMessage = ""
  if (data.tierUpgrade) {
    tierUpgradeMessage = `
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <h2 style="margin: 0 0 10px 0; color: #92400e; font-size: 24px;">🎊 TIER UPGRADE!</h2>
        <p style="margin: 0; color: #78350f; font-size: 16px;">
          You've been promoted from <strong>${data.oldTier.name}</strong> to <strong>${data.newTier.name}</strong>!
        </p>
        <p style="margin: 10px 0 0 0; color: #92400e;">
          You now earn <strong>${data.newTier.multiplier}x points</strong> on every purchase!
        </p>
      </div>
    `
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0; padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 28px;">🎁 Rewards Update</h1>
        </div>
        
        <!-- Main Content -->
        <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <p style="font-size: 18px; color: #1e293b; margin: 0 0 20px 0;">
            Hi ${customerName}! 👋
          </p>
          
          <p style="color: #475569; line-height: 1.6;">
            Thank you for your order <strong>#${data.orderNumber}</strong>! 
            Here's your rewards summary:
          </p>

          ${tierUpgradeMessage}

          <!-- Points Earned Card -->
          <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center;">
            <p style="margin: 0 0 5px 0; color: #065f46; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Points Earned</p>
            <p style="margin: 0; color: #047857; font-size: 48px; font-weight: bold;">+${data.pointsEarned.toLocaleString()}</p>
            <p style="margin: 10px 0 0 0; color: #059669; font-size: 14px;">
              (${data.multiplier}x multiplier applied)
            </p>
          </div>

          <!-- Current Status -->
          <div style="display: flex; justify-content: space-between; gap: 15px; margin: 20px 0;">
            <div style="flex: 1; background: #f1f5f9; border-radius: 10px; padding: 15px; text-align: center;">
              <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px;">YOUR TIER</p>
              <p style="margin: 0; color: #1e293b; font-size: 18px; font-weight: bold;">⭐ ${data.newTier.name}</p>
            </div>
            <div style="flex: 1; background: #f1f5f9; border-radius: 10px; padding: 15px; text-align: center;">
              <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px;">TOTAL POINTS</p>
              <p style="margin: 0; color: #10b981; font-size: 18px; font-weight: bold;">${data.newTotal.toLocaleString()}</p>
            </div>
          </div>

          ${nextTierMessage}

          <!-- CTA Button -->
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.VITE_APP_URL || 'https://9rx.com'}/pharmacy/rewards" 
               style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 10px; font-weight: bold; font-size: 16px;">
              View My Rewards →
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 30px;">
            Keep shopping to earn more points and unlock exclusive rewards!
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">© 2024 9RX. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `

  // Queue the email
  try {
    await supabase.from("email_queue").insert({
      to_email: data.email,
      to_name: customerName,
      subject,
      html_content: htmlContent,
      status: "pending",
      email_type: "reward_notification"
    })
    console.log("Reward email queued for:", data.email)
  } catch (error) {
    console.error("Error queueing reward email:", error)
  }
}

export default {
  getRewardsConfig,
  getRewardTiers,
  getUserTier,
  getNextTier,
  calculateOrderPoints,
  awardOrderPoints
}
