-- =====================================================
-- FIX MISSING REWARD POINTS
-- This script will award missing reward points for recent orders
-- =====================================================

-- STEP 1: First, run CHECK_REWARD_POINTS_ISSUE.sql to identify the problem
-- STEP 2: Then run this script to fix missing points

-- =====================================================
-- BACKUP: Show what will be updated (DRY RUN)
-- =====================================================
SELECT 
    'DRY RUN - Orders that will get points awarded' as action,
    o.id as order_id,
    o.order_number,
    o.profile_id,
    o.grand_total,
    o.payment_method,
    o.created_at,
    p.email,
    p.reward_points as current_points,
    FLOOR(o.grand_total * rc.points_per_dollar) as points_to_award,
    p.reward_points + FLOOR(o.grand_total * rc.points_per_dollar) as new_total_points
FROM orders o
INNER JOIN profiles p ON p.id = o.profile_id
CROSS JOIN rewards_config rc
LEFT JOIN reward_transactions rt ON rt.reference_id = o.id AND rt.reference_type = 'order'
WHERE o.created_at > NOW() - INTERVAL '30 days'  -- Last 30 days
    AND o.payment_method != 'credit'  -- Credit orders don't earn points
    AND o.status NOT IN ('cancelled', 'draft')
    AND o.grand_total > 0
    AND rt.id IS NULL  -- No reward transaction exists
ORDER BY o.created_at DESC;

-- =====================================================
-- ACTUAL FIX: Award missing reward points
-- =====================================================

-- Uncomment the following section to actually award the points
-- WARNING: Only run this after reviewing the DRY RUN results above!

/*
DO $$
DECLARE
    v_order RECORD;
    v_points_to_award INTEGER;
    v_config RECORD;
BEGIN
    -- Get rewards config
    SELECT * INTO v_config FROM rewards_config LIMIT 1;
    
    IF NOT v_config.program_enabled THEN
        RAISE NOTICE '❌ Rewards program is disabled. Enable it first.';
        RETURN;
    END IF;

    RAISE NOTICE '✅ Starting reward points fix...';
    RAISE NOTICE 'Points per dollar: %', v_config.points_per_dollar;

    -- Loop through orders that need points
    FOR v_order IN
        SELECT 
            o.id,
            o.order_number,
            o.profile_id,
            o.grand_total,
            o.created_at,
            p.email,
            p.reward_points,
            p.lifetime_reward_points
        FROM orders o
        INNER JOIN profiles p ON p.id = o.profile_id
        LEFT JOIN reward_transactions rt ON rt.reference_id = o.id AND rt.reference_type = 'order'
        WHERE o.created_at > NOW() - INTERVAL '30 days'
            AND o.payment_method != 'credit'
            AND o.status NOT IN ('cancelled', 'draft')
            AND o.grand_total > 0
            AND rt.id IS NULL
        ORDER BY o.created_at ASC
    LOOP
        -- Calculate points
        v_points_to_award := FLOOR(v_order.grand_total * v_config.points_per_dollar);
        
        IF v_points_to_award > 0 THEN
            -- Update profile points
            UPDATE profiles
            SET 
                reward_points = COALESCE(reward_points, 0) + v_points_to_award,
                lifetime_reward_points = COALESCE(lifetime_reward_points, 0) + v_points_to_award
            WHERE id = v_order.profile_id;
            
            -- Create reward transaction
            INSERT INTO reward_transactions (
                user_id,
                points,
                transaction_type,
                description,
                reference_type,
                reference_id
            ) VALUES (
                v_order.profile_id,
                v_points_to_award,
                'earn',
                'Earned from order #' || v_order.order_number || ' (retroactive)',
                'order',
                v_order.id
            );
            
            RAISE NOTICE '✅ Awarded % points to % for order #%', 
                v_points_to_award, v_order.email, v_order.order_number;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ Reward points fix completed!';
END $$;
*/

-- =====================================================
-- VERIFICATION: Check results after running the fix
-- =====================================================
/*
SELECT 
    'VERIFICATION - Recently awarded points' as action,
    rt.id,
    rt.user_id,
    p.email,
    rt.points,
    rt.description,
    rt.created_at,
    o.order_number
FROM reward_transactions rt
INNER JOIN profiles p ON p.id = rt.user_id
LEFT JOIN orders o ON o.id = rt.reference_id
WHERE rt.description LIKE '%retroactive%'
ORDER BY rt.created_at DESC
LIMIT 20;
*/
