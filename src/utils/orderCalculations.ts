/**
 * Single source of truth for order total calculations
 * USE THIS EVERYWHERE - NO EXCEPTIONS
 */

export interface OrderTotals {
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
}

/**
 * Calculate final total with consistent formula:
 * Total = Subtotal + Shipping + Tax - Discount
 * 
 * @param totals - Order totals object
 * @returns Final total rounded to 2 decimal places
 */
export function calculateFinalTotal({
  subtotal,
  shipping,
  tax,
  discount,
}: OrderTotals): number {
  const total =
    Number(subtotal) +
    Number(shipping) +
    Number(tax) -
    Number(discount);

  return Number(total.toFixed(2));
}

/**
 * Calculate subtotal from cart items
 * Handles both item.price and sizes array
 */
export function calculateSubtotal(cartItems: any[]): number {
  const subtotal = cartItems.reduce((sum, item) => {
    // If item has sizes, calculate from sizes (more accurate)
    if (item.sizes && Array.isArray(item.sizes) && item.sizes.length > 0) {
      return sum + item.sizes.reduce((sizeSum: number, size: any) => {
        return sizeSum + ((size.quantity || 0) * (size.price || 0));
      }, 0);
    }
    // Fallback to item.price
    return sum + (item.price || 0);
  }, 0);

  return Number(subtotal.toFixed(2));
}

/**
 * Calculate discount amount with proper rounding
 * Always round to 2 decimal places ONCE
 */
export function calculateDiscountAmount(
  subtotal: number,
  discountPercent: number
): number {
  const discount = (subtotal * discountPercent) / 100;
  return Number(discount.toFixed(2));
}

/**
 * Calculate shipping amount with complete shipping logic
 * @param cartItems - Cart items
 * @param hasFreeShipping - Whether customer has free shipping (LEGACY - use profileSettings instead)
 * @param subtotal - Order subtotal (optional, for threshold logic)
 * @param settings - Global settings object with shipping config (optional)
 * @param profileSettings - Customer-specific shipping settings (optional)
 * @returns Shipping cost
 * 
 * CORRECT Priority Order (Production-Safe):
 * 1. Profile free shipping - FREE if enabled AND subtotal >= threshold
 * 2. Profile custom shipping rate - Fixed rate if set (fallback if free shipping not applied)
 * 3. Profile auto shipping - Charge if enabled AND subtotal < threshold
 * 4. Global free shipping threshold - FREE if enabled AND subtotal >= threshold
 * 5. Global auto shipping charge - Charge if enabled AND subtotal < threshold
 * 6. Default shipping rate (global) - Flat rate if set
 * 7. Product shipping cost (fallback) - Max shipping from cart items
 */
export function calculateShipping(
  cartItems: any[],
  hasFreeShipping: boolean = false,
  subtotal?: number,
  settings?: {
    // Auto shipping charge settings
    auto_shipping_charge_enabled?: boolean;
    auto_shipping_charge_threshold?: number;
    auto_shipping_charge_amount?: number;
    // Free shipping threshold settings
    free_shipping_enabled?: boolean;
    free_shipping_threshold?: number;
    // Default shipping rate
    default_shipping_rate?: number;
    handling_fee?: number;
  },
  profileSettings?: {
    // Profile-specific shipping settings
    free_shipping_enabled?: boolean;
    free_shipping_threshold?: number;
    custom_shipping_rate?: number;
    auto_shipping_enabled?: boolean;
    auto_shipping_threshold?: number;
    auto_shipping_amount?: number;
  }
): number {
  console.log("=== SHIPPING CALCULATION START ===");
  console.log("Cart items:", cartItems.length);
  console.log("Customer free shipping (legacy):", hasFreeShipping);
  console.log("Subtotal:", subtotal);
  console.log("Global Settings:", settings);
  console.log("Profile Settings:", profileSettings);

  // No items = no shipping
  if (cartItems.length === 0) {
    console.log("✅ No items in cart → $0");
    console.log("=== SHIPPING CALCULATION END ===");
    return 0;
  }

  // Legacy support: hasFreeShipping flag (backward compatibility)
  if (hasFreeShipping) {
    console.log("✅ Priority 0 (Legacy): Customer free shipping flag → $0");
    console.log("=== SHIPPING CALCULATION END ===");
    return 0;
  }

  // Priority 1: Profile free shipping (only if condition satisfied)
  if (
    profileSettings?.free_shipping_enabled &&
    subtotal !== undefined &&
    subtotal >= (profileSettings.free_shipping_threshold || 0)
  ) {
    console.log(`✅ Priority 1: Profile free shipping! Subtotal ${subtotal} >= Threshold ${profileSettings.free_shipping_threshold || 0} → $0`);
    console.log("=== SHIPPING CALCULATION END ===");
    return 0;
  }
  
  // Priority 2: Profile custom shipping rate (fallback if free shipping not applied)
  if (profileSettings?.custom_shipping_rate !== undefined && profileSettings.custom_shipping_rate !== null) {
    const customRate = Number(profileSettings.custom_shipping_rate.toFixed(2));
    const withHandling = customRate + (settings?.handling_fee || 0);
    console.log(`✅ Priority 2: Profile custom shipping rate: ${customRate}, Handling: ${settings?.handling_fee || 0}, Total: ${withHandling}`);
    console.log("=== SHIPPING CALCULATION END ===");
    return Number(withHandling.toFixed(2));
  }
  
  // Priority 3: Profile auto shipping (charge if enabled AND subtotal < threshold)
  if (
    profileSettings?.auto_shipping_enabled &&
    subtotal !== undefined &&
    profileSettings.auto_shipping_threshold > 0 &&
    subtotal < profileSettings.auto_shipping_threshold
  ) {
    const autoCharge = Number((profileSettings.auto_shipping_amount || 0).toFixed(2));
    const withHandling = autoCharge + (settings?.handling_fee || 0);
    console.log(`✅ Priority 3: Profile auto charge! Subtotal ${subtotal} < Threshold ${profileSettings.auto_shipping_threshold}`);
    console.log(`   Base charge: ${autoCharge}, Handling: ${settings?.handling_fee || 0}, Total: ${withHandling}`);
    console.log("=== SHIPPING CALCULATION END ===");
    return Number(withHandling.toFixed(2));
  }
  
  // Priority 4: Global free shipping threshold
  if (
    settings?.free_shipping_enabled &&
    subtotal !== undefined &&
    settings.free_shipping_threshold > 0 &&
    subtotal >= settings.free_shipping_threshold
  ) {
    console.log(`✅ Priority 4: Global free shipping threshold met! Subtotal ${subtotal} >= Threshold ${settings.free_shipping_threshold} → $0`);
    console.log("=== SHIPPING CALCULATION END ===");
    return 0;
  }
  
  // Priority 5: Global auto shipping charge
  if (
    settings?.auto_shipping_charge_enabled &&
    subtotal !== undefined &&
    settings.auto_shipping_charge_threshold > 0 &&
    subtotal < settings.auto_shipping_charge_threshold
  ) {
    const autoCharge = Number((settings.auto_shipping_charge_amount || 0).toFixed(2));
    const withHandling = autoCharge + (settings?.handling_fee || 0);
    console.log(`✅ Priority 5: Global auto charge! Subtotal ${subtotal} < Threshold ${settings.auto_shipping_charge_threshold}`);
    console.log(`   Base charge: ${autoCharge}, Handling: ${settings?.handling_fee || 0}, Total: ${withHandling}`);
    console.log("=== SHIPPING CALCULATION END ===");
    return Number(withHandling.toFixed(2));
  }
  
  // Priority 6: Default shipping rate (global setting)
  if (settings?.default_shipping_rate && settings.default_shipping_rate > 0) {
    const defaultRate = Number(settings.default_shipping_rate.toFixed(2));
    const withHandling = defaultRate + (settings?.handling_fee || 0);
    console.log(`✅ Priority 6: Default shipping rate: ${defaultRate}, Handling: ${settings?.handling_fee || 0}, Total: ${withHandling}`);
    console.log("=== SHIPPING CALCULATION END ===");
    return Number(withHandling.toFixed(2));
  }
  
  // Priority 7: Product shipping cost (fallback)
  const maxShipping = Math.max(0, ...cartItems.map((item) => item.shipping_cost || 0));
  const withHandling = maxShipping + (settings?.handling_fee || 0);
  console.log(`✅ Priority 7: Product shipping cost: ${maxShipping}, Handling: ${settings?.handling_fee || 0}, Total: ${withHandling}`);
  console.log("=== SHIPPING CALCULATION END ===");
  return Number(withHandling.toFixed(2));
}

/**
 * Calculate tax amount
 */
export function calculateTax(subtotal: number, taxPercent: number): number {
  const tax = (subtotal * taxPercent) / 100;
  return Number(tax.toFixed(2));
}
