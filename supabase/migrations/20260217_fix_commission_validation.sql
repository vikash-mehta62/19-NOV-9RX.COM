-- =====================================================
-- FIX GROUP COMMISSION VALIDATION
-- Date: February 17, 2026
-- Description: Add NULL checks and validation to commission calculation
-- =====================================================

-- Drop existing function
DROP FUNCTION IF EXISTS calculate_order_commission() CASCADE;

-- Recreate with proper validation
CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id UUID;
  v_commission_rate DECIMAL(5,2);
  v_commission_amount DECIMAL(12,2);
  v_auto_commission BOOLEAN;
  v_group_status TEXT;
BEGIN
  -- Get the group_id and commission rate for this pharmacy
  SELECT p.group_id, g.commission_rate, g.auto_commission, g.status
  INTO v_group_id, v_commission_rate, v_auto_commission, v_group_status
  FROM profiles p
  LEFT JOIN profiles g ON g.id = p.group_id AND g.type = 'group'
  WHERE p.id = NEW.profile_id;
  
  -- Validate group exists and is active
  IF v_group_id IS NOT NULL THEN
    -- Check if group still exists and is active
    IF v_group_status IS NULL THEN
      RAISE WARNING 'Group % no longer exists for pharmacy %', v_group_id, NEW.profile_id;
      -- Set group_id but no commission
      NEW.group_id := v_group_id;
      NEW.commission_amount := 0;
      RETURN NEW;
    END IF;
    
    IF v_group_status != 'active' THEN
      RAISE WARNING 'Group % is not active (status: %) for order %', v_group_id, v_group_status, NEW.id;
      -- Set group_id but no commission
      NEW.group_id := v_group_id;
      NEW.commission_amount := 0;
      RETURN NEW;
    END IF;
    
    -- If pharmacy belongs to an active group with auto_commission enabled
    IF v_auto_commission = true AND v_commission_rate > 0 AND v_commission_rate <= 100 THEN
      v_commission_amount := (NEW.total_amount * v_commission_rate / 100);
      
      -- Update the order with group_id and commission
      NEW.group_id := v_group_id;
      NEW.commission_amount := v_commission_amount;
      
      -- Insert commission history record (only on INSERT, not UPDATE)
      IF TG_OP = 'INSERT' THEN
        BEGIN
          INSERT INTO group_commission_history (
            group_id, pharmacy_id, order_id, order_amount, commission_rate, commission_amount
          ) VALUES (
            v_group_id, NEW.profile_id, NEW.id, NEW.total_amount, v_commission_rate, v_commission_amount
          )
          ON CONFLICT (order_id) DO UPDATE SET
            order_amount = EXCLUDED.order_amount,
            commission_rate = EXCLUDED.commission_rate,
            commission_amount = EXCLUDED.commission_amount;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'Failed to insert commission history for order %: %', NEW.id, SQLERRM;
            -- Don't fail the order, just log the error
        END;
      END IF;
    ELSE
      -- Just set the group_id for tracking, no commission
      NEW.group_id := v_group_id;
      NEW.commission_amount := 0;
    END IF;
  ELSE
    -- No group association
    NEW.group_id := NULL;
    NEW.commission_amount := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_calculate_order_commission
  BEFORE INSERT OR UPDATE OF total_amount ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_commission();

COMMENT ON FUNCTION calculate_order_commission() IS 
  'Calculates commission for group orders with validation for group existence and status';

-- =====================================================
-- FIX UPDATE GROUP TOTAL COMMISSION FUNCTION
-- =====================================================

DROP FUNCTION IF EXISTS update_group_total_commission() CASCADE;

CREATE OR REPLACE FUNCTION update_group_total_commission()
RETURNS TRIGGER AS $$
DECLARE
  v_group_id UUID;
BEGIN
  -- Determine which group_id to update
  IF TG_OP = 'DELETE' THEN
    v_group_id := OLD.group_id;
  ELSE
    v_group_id := NEW.group_id;
  END IF;
  
  -- Validate group exists
  IF v_group_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Check if group still exists
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_group_id AND type = 'group') THEN
    RAISE WARNING 'Group % no longer exists, skipping commission total update', v_group_id;
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Update the group's total commission
  BEGIN
    UPDATE profiles
    SET total_commission = (
      SELECT COALESCE(SUM(commission_amount), 0)
      FROM group_commission_history
      WHERE group_id = v_group_id AND status != 'cancelled'
    )
    WHERE id = v_group_id AND type = 'group';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to update total commission for group %: %', v_group_id, SQLERRM;
  END;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER trigger_update_group_commission
  AFTER INSERT OR UPDATE OR DELETE ON group_commission_history
  FOR EACH ROW
  EXECUTE FUNCTION update_group_total_commission();

COMMENT ON FUNCTION update_group_total_commission() IS 
  'Updates group total commission with validation for group existence';
