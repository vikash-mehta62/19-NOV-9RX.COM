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
 * Get shipping cost from cart items
 * Returns max shipping cost or 0 if free shipping
 */
export function calculateShipping(
  cartItems: any[],
  hasFreeShipping: boolean = false
): number {
  if (hasFreeShipping || cartItems.length === 0) {
    return 0;
  }
  const maxShipping = Math.max(0, ...cartItems.map((item) => item.shipping_cost || 0));
  return Number(maxShipping.toFixed(2));
}

/**
 * Calculate tax amount
 */
export function calculateTax(subtotal: number, taxPercent: number): number {
  const tax = (subtotal * taxPercent) / 100;
  return Number(tax.toFixed(2));
}
