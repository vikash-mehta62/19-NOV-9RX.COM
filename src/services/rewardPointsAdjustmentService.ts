/**
 * Reward Points Adjustment Service
 * 
 * Handles reward points adjustments when order totals change after order creation
 */

import { supabase } from "@/integrations/supabase/client";
import { getRewardsConfig } from "./rewardsService";

interface AdjustmentResult {
  success: boolean;
  pointsAdjusted: number;
  newTotal: number;
  oldTotal: number;
  adjustmentType: 'increase' | 'decrease' | 'none';
  error?: string;
}

/**
 * Adjust reward points when order total changes
 * 
 * @param userId - Customer ID whose points need adjustment
 * @param orderId - Order ID that was modified
 * @param oldTotal - Original order total
 * @param newTotal - New order total after edit
 * @param orderNumber - Order number for transaction description
 * @returns Adjustment result with points changed
 */
export async function adjustRewardPointsForOrderEdit(
  userId: string,
  orderId: string,
  oldTotal: number,
  newTotal: number,
  orderNumber: string
): Promise<AdjustmentResult> {
  try {
    console.log(`🔄 Adjusting reward points for order ${orderNumber}`);
    console.log(`   User: ${userId}`);
    console.log(`   Old Total: $${oldTotal.toFixed(2)}`);
    console.log(`   New Total: $${newTotal.toFixed(2)}`);

    // Get rewards config
    const config = await getRewardsConfig();
    if (!config?.program_enabled) {
      console.log('⚠️  Rewards program is disabled, skipping adjustment');
      return {
        success: false,
        pointsAdjusted: 0,
        newTotal,
        oldTotal,
        adjustmentType: 'none',
        error: 'Rewards program is disabled'
      };
    }

    // Check if this order has reward points transaction
    const { data: existingTransaction, error: transError } = await supabase
      .from("reward_transactions")
      .select("id, points")
      .eq("reference_id", orderId)
      .eq("reference_type", "order")
      .eq("transaction_type", "earn")
      .maybeSingle();

    if (transError) {
      console.error('❌ Error checking existing transaction:', transError);
      throw transError;
    }

    if (!existingTransaction) {
      console.log('⚠️  No reward transaction found for this order, skipping adjustment');
      return {
        success: false,
        pointsAdjusted: 0,
        newTotal,
        oldTotal,
        adjustmentType: 'none',
        error: 'No reward transaction found for this order'
      };
    }

    // Calculate old and new points
    const oldPoints = Math.floor(oldTotal * config.points_per_dollar);
    const newPoints = Math.floor(newTotal * config.points_per_dollar);
    const pointsDifference = newPoints - oldPoints;

    console.log(`   Old Points: ${oldPoints}`);
    console.log(`   New Points: ${newPoints}`);
    console.log(`   Difference: ${pointsDifference > 0 ? '+' : ''}${pointsDifference}`);

    // If no change in points, skip
    if (pointsDifference === 0) {
      console.log('✅ No points adjustment needed (same points)');
      return {
        success: true,
        pointsAdjusted: 0,
        newTotal,
        oldTotal,
        adjustmentType: 'none'
      };
    }

    // Get user's current points
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("reward_points, lifetime_reward_points")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error('❌ Error fetching user profile:', userError);
      throw new Error('User not found');
    }

    const currentPoints = user.reward_points || 0;
    const currentLifetimePoints = user.lifetime_reward_points || 0;

    // Calculate new totals
    const updatedPoints = Math.max(0, currentPoints + pointsDifference);
    const updatedLifetimePoints = pointsDifference > 0 
      ? currentLifetimePoints + pointsDifference 
      : currentLifetimePoints; // Don't reduce lifetime points

    console.log(`   Current Points: ${currentPoints}`);
    console.log(`   Updated Points: ${updatedPoints}`);

    // Update user's points
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        reward_points: updatedPoints,
        lifetime_reward_points: updatedLifetimePoints
      })
      .eq("id", userId);

    if (updateError) {
      console.error('❌ Error updating user points:', updateError);
      throw updateError;
    }

    // Create adjustment transaction
    const adjustmentType = pointsDifference > 0 ? 'increase' : 'decrease';
    const transactionDescription = pointsDifference > 0
      ? `Order #${orderNumber} total increased: +${pointsDifference} points (${oldTotal.toFixed(2)} → ${newTotal.toFixed(2)})`
      : `Order #${orderNumber} total decreased: ${pointsDifference} points (${oldTotal.toFixed(2)} → ${newTotal.toFixed(2)})`;

    const { error: transInsertError } = await supabase
      .from("reward_transactions")
      .insert({
        user_id: userId,
        points: pointsDifference,
        transaction_type: pointsDifference > 0 ? 'earn' : 'adjust',
        description: transactionDescription,
        reference_type: 'order_edit',
        reference_id: orderId
      });

    if (transInsertError) {
      console.error('❌ Error creating adjustment transaction:', transInsertError);
      throw transInsertError;
    }

    console.log(`✅ Reward points adjusted successfully: ${pointsDifference > 0 ? '+' : ''}${pointsDifference} points`);

    return {
      success: true,
      pointsAdjusted: pointsDifference,
      newTotal: updatedPoints,
      oldTotal: currentPoints,
      adjustmentType
    };

  } catch (error) {
    console.error('❌ Error adjusting reward points:', error);
    return {
      success: false,
      pointsAdjusted: 0,
      newTotal,
      oldTotal,
      adjustmentType: 'none',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if order is eligible for reward points adjustment
 * 
 * @param orderId - Order ID to check
 * @returns Whether order is eligible for points adjustment
 */
export async function isOrderEligibleForPointsAdjustment(orderId: string): Promise<boolean> {
  try {
    // Check if order has reward transaction
    const { data: transaction } = await supabase
      .from("reward_transactions")
      .select("id")
      .eq("reference_id", orderId)
      .eq("reference_type", "order")
      .eq("transaction_type", "earn")
      .maybeSingle();

    return !!transaction;
  } catch (error) {
    console.error('Error checking order eligibility:', error);
    return false;
  }
}

/**
 * Get reward points history for an order
 * 
 * @param orderId - Order ID
 * @returns Array of reward transactions for this order
 */
export async function getOrderRewardHistory(orderId: string) {
  try {
    const { data: transactions, error } = await supabase
      .from("reward_transactions")
      .select("*")
      .or(`reference_id.eq.${orderId}`)
      .in("reference_type", ["order", "order_edit"])
      .order("created_at", { ascending: false });

    if (error) throw error;

    return transactions || [];
  } catch (error) {
    console.error('Error fetching order reward history:', error);
    return [];
  }
}

export default {
  adjustRewardPointsForOrderEdit,
  isOrderEligibleForPointsAdjustment,
  getOrderRewardHistory
};
