import { supabase } from "@/integrations/supabase/client"

export interface ProductReview {
  id: string
  user_id: string
  product_id: string
  size_id?: string
  order_id?: string
  rating: number
  title?: string
  review_text?: string
  is_verified_purchase: boolean
  is_approved: boolean
  points_awarded: boolean
  helpful_count: number
  created_at: string
  updated_at: string
  user?: {
    first_name: string
    last_name: string
    company_name: string
  }
}

export interface ReviewStats {
  averageRating: number
  totalReviews: number
  ratingDistribution: { [key: number]: number }
}

// Submit a product review
export async function submitReview(
  userId: string,
  productId: string,
  rating: number,
  title?: string,
  reviewText?: string,
  sizeId?: string,
  orderId?: string
): Promise<{ success: boolean; message: string; pointsEarned?: number }> {
  try {
    // Check if user already reviewed this product
    const { data: existingReview } = await supabase
      .from("product_reviews")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .maybeSingle()

    if (existingReview) {
      return { success: false, message: "You have already reviewed this product" }
    }

    // Check if this is a verified purchase
    let isVerifiedPurchase = false
    if (orderId) {
      const { data: order } = await supabase
        .from("orders")
        .select("id")
        .eq("id", orderId)
        .eq("profile_id", userId)
        .single()
      isVerifiedPurchase = !!order
    } else {
      // Check if user has ever ordered this product
      const { data: orders } = await supabase
        .from("orders")
        .select("id, items")
        .eq("profile_id", userId)
        .eq("status", "delivered")

      if (orders) {
        isVerifiedPurchase = orders.some(order => {
          const items = order.items as any[]
          return items?.some(item => item.productId === productId)
        })
      }
    }

    // Insert the review
    const { data: review, error } = await supabase
      .from("product_reviews")
      .insert({
        user_id: userId,
        product_id: productId,
        size_id: sizeId,
        order_id: orderId,
        rating,
        title,
        review_text: reviewText,
        is_verified_purchase: isVerifiedPurchase,
        is_approved: true, // Auto-approve for now
        points_awarded: false
      })
      .select()
      .single()

    if (error) throw error

    // Award review bonus points
    const pointsEarned = await awardReviewPoints(userId, review.id)

    return { 
      success: true, 
      message: isVerifiedPurchase 
        ? "Thank you for your verified review!" 
        : "Thank you for your review!",
      pointsEarned
    }
  } catch (error: any) {
    console.error("Error submitting review:", error)
    if (error.code === "23505") {
      return { success: false, message: "You have already reviewed this product" }
    }
    return { success: false, message: "Failed to submit review" }
  }
}

// Award points for review using RPC function (bypasses RLS)
async function awardReviewPoints(userId: string, reviewId: string): Promise<number> {
  try {
    // Get review bonus from config
    const { data: config } = await supabase
      .from("rewards_config")
      .select("review_bonus")
      .maybeSingle()

    const reviewBonus = config?.review_bonus || 50

    console.log(`🔵 Awarding ${reviewBonus} points to user ${userId} for review ${reviewId}`)

    // Call RPC function to award points (bypasses RLS)
    const { data, error } = await supabase.rpc('award_review_points', {
      p_user_id: userId,
      p_points: reviewBonus,
      p_review_id: reviewId
    })

    if (error) {
      console.error("❌ RPC award_review_points error:", error)
      
      // Fallback: Try direct update (might fail due to RLS)
      console.log("🔄 Trying fallback direct update...")
      return await fallbackAwardPoints(userId, reviewId, reviewBonus)
    }

    console.log(`✅ RPC Response:`, data)

    if (data?.success) {
      console.log(`✅ Review points awarded: ${data.points_awarded} points. New balance: ${data.new_points}`)
      return data.points_awarded
    } else {
      console.error("❌ RPC returned error:", data?.error)
      return 0
    }
  } catch (error) {
    console.error("Error awarding review points:", error)
    return 0
  }
}

// Fallback method if RPC doesn't exist yet
async function fallbackAwardPoints(userId: string, reviewId: string, reviewBonus: number): Promise<number> {
  try {
    // Get user's current points
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("reward_points, lifetime_reward_points")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      console.error("Error fetching user:", userError)
      return 0
    }

    const newPoints = (user.reward_points || 0) + reviewBonus
    const newLifetime = (user.lifetime_reward_points || 0) + reviewBonus

    // Try to update (may fail due to RLS)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        reward_points: newPoints,
        lifetime_reward_points: newLifetime
      })
      .eq("id", userId)

    if (updateError) {
      console.error("❌ Fallback update failed (RLS issue):", updateError)
      console.error("⚠️ Please run the SQL migration: supabase/migrations/20241224_award_review_points_function.sql")
      return 0
    }

    // Mark review as points awarded
    await supabase
      .from("product_reviews")
      .update({ points_awarded: true })
      .eq("id", reviewId)

    // Log transaction
    await supabase
      .from("reward_transactions")
      .insert({
        user_id: userId,
        points: reviewBonus,
        transaction_type: "bonus",
        description: "Review bonus - thank you for your feedback!",
        reference_type: "review",
        reference_id: reviewId
      })

    console.log(`✅ Fallback: Points awarded: ${reviewBonus}`)
    return reviewBonus
  } catch (error) {
    console.error("Fallback error:", error)
    return 0
  }
}

// Get reviews for a product
export async function getProductReviews(
  productId: string,
  limit: number = 10,
  offset: number = 0
): Promise<ProductReview[]> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select(`
      *,
      user:user_id(first_name, last_name, company_name)
    `)
    .eq("product_id", productId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("Error fetching reviews:", error)
    return []
  }

  return data || []
}

// Get review statistics for a product
export async function getProductReviewStats(productId: string): Promise<ReviewStats> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select("rating")
    .eq("product_id", productId)
    .eq("is_approved", true)

  if (error || !data || data.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    }
  }

  const totalReviews = data.length
  const averageRating = data.reduce((sum, r) => sum + r.rating, 0) / totalReviews
  
  const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  data.forEach(r => {
    ratingDistribution[r.rating] = (ratingDistribution[r.rating] || 0) + 1
  })

  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalReviews,
    ratingDistribution
  }
}

// Get user's reviews
export async function getUserReviews(userId: string): Promise<ProductReview[]> {
  const { data, error } = await supabase
    .from("product_reviews")
    .select(`
      *,
      product:product_id(name, image_url)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching user reviews:", error)
    return []
  }

  return data || []
}

// Check if user can review a product
export async function canUserReview(userId: string, productId: string): Promise<{ canReview: boolean; reason?: string }> {
  // Check if already reviewed
  const { data: existingReview } = await supabase
    .from("product_reviews")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle()

  if (existingReview) {
    return { canReview: false, reason: "You have already reviewed this product" }
  }

  return { canReview: true }
}

// Update review
export async function updateReview(
  reviewId: string,
  userId: string,
  rating: number,
  title?: string,
  reviewText?: string
): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase
    .from("product_reviews")
    .update({
      rating,
      title,
      review_text: reviewText,
      updated_at: new Date().toISOString()
    })
    .eq("id", reviewId)
    .eq("user_id", userId)

  if (error) {
    return { success: false, message: "Failed to update review" }
  }

  return { success: true, message: "Review updated successfully" }
}

// Delete review
export async function deleteReview(reviewId: string, userId: string): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from("product_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", userId)

  return { success: !error }
}

// Mark review as helpful
export async function markReviewHelpful(reviewId: string, userId: string): Promise<{ success: boolean; newCount: number }> {
  try {
    // Check if already voted
    const { data: existingVote } = await supabase
      .from("review_helpful")
      .select("id")
      .eq("review_id", reviewId)
      .eq("user_id", userId)
      .single()

    if (existingVote) {
      // Remove vote
      await supabase
        .from("review_helpful")
        .delete()
        .eq("id", existingVote.id)

      // Decrement count
      const { data: review } = await supabase
        .from("product_reviews")
        .select("helpful_count")
        .eq("id", reviewId)
        .single()

      const newCount = Math.max(0, (review?.helpful_count || 1) - 1)
      await supabase
        .from("product_reviews")
        .update({ helpful_count: newCount })
        .eq("id", reviewId)

      return { success: true, newCount }
    } else {
      // Add vote
      await supabase
        .from("review_helpful")
        .insert({ review_id: reviewId, user_id: userId })

      // Increment count
      const { data: review } = await supabase
        .from("product_reviews")
        .select("helpful_count")
        .eq("id", reviewId)
        .single()

      const newCount = (review?.helpful_count || 0) + 1
      await supabase
        .from("product_reviews")
        .update({ helpful_count: newCount })
        .eq("id", reviewId)

      return { success: true, newCount }
    }
  } catch (error) {
    console.error("Error marking review helpful:", error)
    return { success: false, newCount: 0 }
  }
}

export default {
  submitReview,
  getProductReviews,
  getProductReviewStats,
  getUserReviews,
  canUserReview,
  updateReview,
  deleteReview,
  markReviewHelpful
}
