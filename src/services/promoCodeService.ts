// Promo Code Service - Validate and apply promo codes
import { supabase } from "@/integrations/supabase/client";
import {
  getSpecialPricingSizeIds,
  hasAnyActiveSpecialPricing,
} from "@/services/specialPricingService";

export interface CartItem {
  productId: string;
  categoryId?: string;
  price: number;
  quantity: number;
  sizes?: any[]; // Include sizes array for group pricing check
}

interface PromoValidationResult {
  valid: boolean;
  offerId?: string;
  discountType?: "percentage" | "flat" | "free_shipping";
  discountValue?: number;
  maxDiscount?: number;
  message: string;
  error?: string;
  calculatedDiscount?: number;
  applicableAmount?: number; // Amount the discount applies to
}

interface Offer {
  id: string;
  title: string;
  offer_type: string;
  discount_value: number | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  promo_code: string | null;
  usage_limit: number | null;
  used_count: number;
  is_active: boolean;
  start_date: string;
  end_date: string;
  applicable_to: string;
  applicable_ids: string[] | null;
  user_groups: string[] | null;
}

const isProductScopedOffer = (applicableTo?: string | null) =>
  applicableTo === "product";

const isSizeScopedOffer = (applicableTo?: string | null) =>
  applicableTo === "specific_product";

// Helper function to calculate applicable amount for product/category specific offers
export function calculateApplicableAmount(
  cartItems: CartItem[],
  applicableIds: string[],
  applicationType: 'product' | 'category' | 'size',
  groupPricingSizeIds?: string[]
): number {
  return cartItems
    .filter(item => {
      // Check if item matches the applicable criteria
      if (applicationType === 'product') {
        return applicableIds.includes(item.productId);
      } else if (applicationType === 'size') {
        return Boolean(
          item.sizes &&
          Array.isArray(item.sizes) &&
          item.sizes.some((size: any) => applicableIds.includes(size.id))
        );
      } else {
        return item.categoryId && applicableIds.includes(item.categoryId);
      }
    })
    .reduce((sum, item) => {
      // Calculate sum based on sizes if available
      if (item.sizes && Array.isArray(item.sizes)) {
        return sum + item.sizes.reduce((sizeSum: number, size: any) => {
          // Only include size if it doesn't have group pricing
          if (groupPricingSizeIds && groupPricingSizeIds.includes(size.id)) {
            return sizeSum; // Skip this size
          }
          if (applicationType === 'size' && !applicableIds.includes(size.id)) {
            return sizeSum;
          }
          return sizeSum + ((size.price || item.price) * (size.quantity || 1));
        }, 0);
      }
      if (applicationType === 'size') {
        return sum;
      }
      return sum + (item.price * item.quantity);
    }, 0);
}

// Validate promo code (new signature with cart items)
export async function validatePromoCode(
  code: string,
  orderAmount: number,
  cartItems: CartItem[],
  userId?: string,
  userType?: string
): Promise<PromoValidationResult> {
  try {
    if (!code || code.trim() === "") {
      return { valid: false, message: "Please enter a promo code" };
    }

    if (userId && await hasAnyActiveSpecialPricing(userId)) {
      return {
        valid: false,
        message: "Promo codes cannot be applied because your account has active special pricing.",
      };
    }

    // ⚠️ CHECK FOR GROUP PRICING - Show warning if some items have group pricing
    // Promo codes will only apply to non-group-pricing items
    let hasGroupPricingItems = false;
    let hasNonGroupPricingItems = false;
    let groupPricingSizeIds: string[] = [];
    
    if (userId) {
      const sizeIds: string[] = [];
      
      // Collect all size IDs from cart items
      cartItems.forEach(item => {
        if (item.sizes && Array.isArray(item.sizes)) {
          item.sizes.forEach((size: any) => {
            if (size.id) {
              sizeIds.push(size.id);
            }
          });
        }
      });

      if (sizeIds.length > 0) {
        groupPricingSizeIds = await getSpecialPricingSizeIds(userId, sizeIds);

        hasGroupPricingItems = groupPricingSizeIds.length > 0;
        hasNonGroupPricingItems = sizeIds.length > groupPricingSizeIds.length;

        if (hasGroupPricingItems && !hasNonGroupPricingItems) {
          return {
            valid: false,
            message: "Promo codes cannot be applied. All items in your cart have group pricing and you're already getting a special discount!"
          };
        }
      }
    }

    // Find the offer
    const { data: offer, error } = await supabase
      .from("offers")
      .select("*")
      .eq("promo_code", code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (error || !offer) {
      return { valid: false, message: "Invalid or expired promo code" };
    }

    // Check dates
    const now = new Date();
    const startDate = new Date(offer.start_date);
    const endDate = new Date(offer.end_date);

    if (now < startDate) {
      return { valid: false, message: "This promo code is not yet active" };
    }

    if (now > endDate) {
      return { valid: false, message: "This promo code has expired" };
    }

    // Check usage limit
    if (offer.usage_limit && offer.used_count >= offer.usage_limit) {
      return { valid: false, message: "This promo code has reached its usage limit" };
    }

    // Check minimum order amount
    if (offer.min_order_amount && orderAmount < offer.min_order_amount) {
      return { 
        valid: false, 
        message: `Minimum order amount is $${offer.min_order_amount}` 
      };
    }

    // Check first order restriction
    if (offer.applicable_to === "first_order" && userId) {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("profile_id", userId)
        .neq("status", "cancelled");

      if ((count || 0) > 0) {
        return { valid: false, message: "This offer is only for first orders" };
      }
    }

    // Check user group restriction
    if (offer.applicable_to === "user_group" && offer.user_groups) {
      if (!userType || !offer.user_groups.includes(userType)) {
        return { valid: false, message: "This offer is not available for your account type" };
      }
    }

    // Extract product and category IDs from cart
    const productIds = cartItems.map(item => item.productId);
    const categoryIds = cartItems
      .map(item => item.categoryId)
      .filter((id): id is string => id !== undefined);
    const sizeIds = cartItems.flatMap((item) =>
      item.sizes && Array.isArray(item.sizes)
        ? item.sizes.map((size: any) => size.id).filter(Boolean)
        : []
    );

    // Check category restriction
    if (offer.applicable_to === "category" && offer.applicable_ids && categoryIds.length > 0) {
      const hasMatchingCategory = categoryIds.some(id => offer.applicable_ids!.includes(id));
      if (!hasMatchingCategory) {
        return { valid: false, message: "This offer is not applicable to items in your cart" };
      }
    }

    // Check product restriction
    if (isProductScopedOffer(offer.applicable_to) && offer.applicable_ids && productIds.length > 0) {
      const hasMatchingProduct = productIds.some(id => offer.applicable_ids!.includes(id));
      if (!hasMatchingProduct) {
        return { valid: false, message: "This offer is not applicable to items in your cart" };
      }
    }

    if (isSizeScopedOffer(offer.applicable_to) && offer.applicable_ids && sizeIds.length > 0) {
      const hasMatchingSize = sizeIds.some(id => offer.applicable_ids!.includes(id));
      if (!hasMatchingSize) {
        return { valid: false, message: "This offer is not applicable to items in your cart" };
      }
    }

    // Calculate applicable amount based on offer type (excluding group pricing items)
    let applicableAmount = orderAmount; // Default to full order

    console.log('=== VALIDATE PROMO DEBUG ===');
    console.log('offer.applicable_to:', offer.applicable_to);
    console.log('groupPricingSizeIds:', groupPricingSizeIds);
    console.log('cartItems:', cartItems);
    console.log('orderAmount:', orderAmount);

    if (isProductScopedOffer(offer.applicable_to) && offer.applicable_ids) {
      // Calculate only for matching products (excluding group pricing)
      applicableAmount = calculateApplicableAmount(cartItems, offer.applicable_ids, 'product', groupPricingSizeIds);
      console.log('Product-specific applicableAmount:', applicableAmount);
      
      if (applicableAmount === 0) {
        return { valid: false, message: "This offer is not applicable to items in your cart" };
      }
    } else if (isSizeScopedOffer(offer.applicable_to) && offer.applicable_ids) {
      applicableAmount = calculateApplicableAmount(cartItems, offer.applicable_ids, 'size', groupPricingSizeIds);
      console.log('Size-specific applicableAmount:', applicableAmount);

      if (applicableAmount === 0) {
        return { valid: false, message: "This offer is not applicable to items in your cart" };
      }
    } else if (offer.applicable_to === "category" && offer.applicable_ids) {
      // Calculate only for matching categories (excluding group pricing)
      applicableAmount = calculateApplicableAmount(cartItems, offer.applicable_ids, 'category', groupPricingSizeIds);
      console.log('Category-specific applicableAmount:', applicableAmount);
      
      if (applicableAmount === 0) {
        return { valid: false, message: "This offer is not applicable to items in your cart" };
      }
    } else if (offer.applicable_to === "all" && groupPricingSizeIds.length > 0) {
      // For "all" type offers, also exclude group pricing items
      // Calculate total excluding group pricing sizes
      applicableAmount = cartItems.reduce((sum, item) => {
        if (item.sizes && Array.isArray(item.sizes)) {
          return sum + item.sizes.reduce((sizeSum: number, size: any) => {
            if (groupPricingSizeIds.includes(size.id)) {
              return sizeSum; // Skip group pricing sizes
            }
            return sizeSum + ((size.price || item.price) * (size.quantity || 1));
          }, 0);
        }
        return sum + (item.price * item.quantity);
      }, 0);
      console.log('All-type applicableAmount (after excluding group pricing):', applicableAmount);
    }

    console.log('Final applicableAmount:', applicableAmount);

    // Calculate discount based on applicable amount
    let calculatedDiscount = 0;
    
    if (offer.offer_type === "percentage") {
      calculatedDiscount = (applicableAmount * (offer.discount_value || 0)) / 100;
      if (offer.max_discount_amount && calculatedDiscount > offer.max_discount_amount) {
        calculatedDiscount = offer.max_discount_amount;
      }
    } else if (offer.offer_type === "flat") {
      calculatedDiscount = Math.min(offer.discount_value || 0, applicableAmount);
    } else if (offer.offer_type === "free_shipping") {
      // Free shipping - discount will be applied to shipping cost
      calculatedDiscount = 0; // Handled separately
    }

    const savingsMessage = offer.offer_type === "free_shipping" 
      ? `${offer.title} applied! Free shipping on this order${hasGroupPricingItems ? ' (excluding group pricing items)' : ''}`
      : `${offer.title} applied! You save $${calculatedDiscount.toFixed(2)}${hasGroupPricingItems ? ' (on eligible items)' : ''}`;

    return {
      valid: true,
      offerId: offer.id,
      discountType: offer.offer_type as any,
      discountValue: offer.discount_value || 0,
      maxDiscount: offer.max_discount_amount || undefined,
      message: savingsMessage,
      calculatedDiscount,
      applicableAmount,
    };
  } catch (error: any) {
    console.error("Error validating promo code:", error);
    return { valid: false, message: "Error validating promo code" };
  }
}

// Backward compatible wrapper (deprecated - use validatePromoCode with cartItems)
export async function validatePromoCodeLegacy(
  code: string,
  orderAmount: number,
  userId?: string,
  userType?: string,
  categoryIds?: string[],
  productIds?: string[]
): Promise<PromoValidationResult> {
  // Convert to new format
  const cartItems: CartItem[] = [];
  
  if (productIds && productIds.length > 0) {
    // Create cart items from product IDs (price will be estimated)
    for (const productId of productIds) {
      cartItems.push({
        productId,
        categoryId: categoryIds?.[0], // Approximate
        price: orderAmount / productIds.length, // Estimate equal distribution
        quantity: 1
      });
    }
  } else {
    // Fallback: single item with full amount
    cartItems.push({
      productId: 'unknown',
      categoryId: categoryIds?.[0],
      price: orderAmount,
      quantity: 1
    });
  }
  
  return validatePromoCode(code, orderAmount, cartItems, userId, userType);
}

// Apply promo code (increment usage count)
export async function applyPromoCode(
  offerId: string,
  discountAmount: number
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc("apply_promo_code", {
      p_offer_id: offerId,
      p_discount_amount: discountAmount,
    });

    if (error) {
      // Fallback to direct update if RPC doesn't exist
      const { data: offer } = await supabase
        .from("offers")
        .select("used_count, total_discount_given, total_orders")
        .eq("id", offerId)
        .single();

      if (offer) {
        await supabase
          .from("offers")
          .update({
            used_count: (offer.used_count || 0) + 1,
            total_discount_given: (offer.total_discount_given || 0) + discountAmount,
            total_orders: (offer.total_orders || 0) + 1,
          })
          .eq("id", offerId);
      }
    }

    return true;
  } catch (error) {
    console.error("Error applying promo code:", error);
    return false;
  }
}

// Get active offers for display
export async function getActiveOffers(): Promise<Offer[]> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("is_active", true)
      .lte("start_date", now)
      .gte("end_date", now)
      .order("discount_value", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching active offers:", error);
    return [];
  }
}

// Get auto-apply offers (no promo code required)
export async function getAutoApplyOffers(
  orderAmount: number,
  userType?: string,
  categoryIds?: string[],
  productIds?: string[]
): Promise<Offer[]> {
  try {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("is_active", true)
      .is("promo_code", null)
      .lte("start_date", now)
      .gte("end_date", now);

    if (error) throw error;
    if (!data) return [];

    // Filter offers based on conditions
    return data.filter(offer => {
      // Check min order amount
      if (offer.min_order_amount && orderAmount < offer.min_order_amount) {
        return false;
      }

      // Check usage limit
      if (offer.usage_limit && offer.used_count >= offer.usage_limit) {
        return false;
      }

      // Check user group
      if (offer.applicable_to === "user_group" && offer.user_groups) {
        if (!userType || !offer.user_groups.includes(userType)) {
          return false;
        }
      }

      // Check category
      if (offer.applicable_to === "category" && offer.applicable_ids && categoryIds) {
        if (!categoryIds.some(id => offer.applicable_ids!.includes(id))) {
          return false;
        }
      }

      // Check product
      if (isProductScopedOffer(offer.applicable_to) && offer.applicable_ids && productIds) {
        if (!productIds.some(id => offer.applicable_ids!.includes(id))) {
          return false;
        }
      }

      if (isSizeScopedOffer(offer.applicable_to) && offer.applicable_ids) {
        return false;
      }

      return true;
    });
  } catch (error) {
    console.error("Error fetching auto-apply offers:", error);
    return [];
  }
}

// Calculate best discount from multiple offers
export function calculateBestDiscount(
  offers: Offer[],
  orderAmount: number
): { offer: Offer | null; discount: number } {
  let bestOffer: Offer | null = null;
  let bestDiscount = 0;

  for (const offer of offers) {
    let discount = 0;

    if (offer.offer_type === "percentage") {
      discount = (orderAmount * (offer.discount_value || 0)) / 100;
      if (offer.max_discount_amount && discount > offer.max_discount_amount) {
        discount = offer.max_discount_amount;
      }
    } else if (offer.offer_type === "flat") {
      discount = offer.discount_value || 0;
    }

    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestOffer = offer;
    }
  }

  return { offer: bestOffer, discount: bestDiscount };
}

// Helper function to prepare promo code display data
export function preparePromoDisplayData(
  validationResult: PromoValidationResult,
  offer: Offer,
  cartItems: CartItem[],
  productNames?: Map<string, string>,
  groupPricingSizeIds?: string[] // Add parameter for group pricing size IDs
): {
  applicableItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    hasDiscount: boolean;
    notEligibleReason?: string;
  }>;
  applicableTo: string;
} {
  const applicableItems: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    hasDiscount: boolean;
    notEligibleReason?: string;
  }> = [];

  cartItems.forEach(item => {
    // If item has sizes, create separate entries for each size
    if (item.sizes && Array.isArray(item.sizes) && item.sizes.length > 0) {
      item.sizes.forEach((size: any) => {
        let hasDiscount = false;
        const sizeId = size.id || `${item.productId}-${size.size_value}`;

        // Check if this item gets the discount
        if (offer.applicable_to === "all") {
          hasDiscount = true;
        } else if (isProductScopedOffer(offer.applicable_to) && offer.applicable_ids) {
          hasDiscount = offer.applicable_ids.includes(item.productId);
        } else if (isSizeScopedOffer(offer.applicable_to) && offer.applicable_ids) {
          hasDiscount = offer.applicable_ids.includes(sizeId);
        } else if (offer.applicable_to === "category" && offer.applicable_ids && item.categoryId) {
          hasDiscount = offer.applicable_ids.includes(item.categoryId);
        }

        // ⚠️ Override: Check if this size has group pricing
        if (groupPricingSizeIds && groupPricingSizeIds.includes(sizeId)) {
          hasDiscount = false;
        }

        const productName = productNames?.get(item.productId) || `Product ${item.productId.slice(0, 8)}`;
        const sizeName = size.size_name || `${size.size_value} ${size.size_unit || ''}`.trim();

        applicableItems.push({
          id: sizeId,
          name: `${productName} - ${sizeName}`,
          price: size.price || item.price,
          quantity: size.quantity || 1,
          hasDiscount,
          // notEligibleReason: (groupPricingSizeIds && groupPricingSizeIds.includes(sizeId)) 
          //   ? "Group pricing already applied" 
          //   : undefined
          notEligibleReason: undefined
        });
      });
    } else {
      // No sizes, use product-level data
      let hasDiscount = false;

      if (offer.applicable_to === "all") {
        hasDiscount = true;
      } else if (isProductScopedOffer(offer.applicable_to) && offer.applicable_ids) {
        hasDiscount = offer.applicable_ids.includes(item.productId);
      } else if (isSizeScopedOffer(offer.applicable_to)) {
        hasDiscount = false;
      } else if (offer.applicable_to === "category" && offer.applicable_ids && item.categoryId) {
        hasDiscount = offer.applicable_ids.includes(item.categoryId);
      }

      applicableItems.push({
        id: item.productId,
        name: productNames?.get(item.productId) || `Product ${item.productId.slice(0, 8)}`,
        price: item.price,
        quantity: item.quantity,
        hasDiscount,
      });
    }
  });

  return {
    applicableItems,
    applicableTo: offer.applicable_to,
  };
}

// Calculate item-level discounts for display
export function calculateItemDiscounts(
  cartItems: CartItem[],
  offer: Offer,
  totalDiscount: number,
  groupPricingSizeIds?: string[]
): Map<string, number> {
  const itemDiscounts = new Map<string, number>();

  // Helper function to get item total excluding group pricing sizes
  const getItemTotal = (item: CartItem): number => {
    if (item.sizes && Array.isArray(item.sizes)) {
      return item.sizes.reduce((sum: number, size: any) => {
        // Skip sizes with group pricing
        if (groupPricingSizeIds && groupPricingSizeIds.includes(size.id)) {
          return sum;
        }
        return sum + ((size.price || item.price) * (size.quantity || 1));
      }, 0);
    }
    return item.price * item.quantity;
  };

  // Helper function to check if item has ANY eligible (non-group-pricing) sizes
  const hasEligibleSizes = (item: CartItem): boolean => {
    if (!item.sizes || !Array.isArray(item.sizes)) return true; // No sizes = eligible
    if (!groupPricingSizeIds || groupPricingSizeIds.length === 0) return true; // No group pricing = all eligible
    
    // Check if at least one size is NOT in group pricing
    return item.sizes.some((size: any) => !groupPricingSizeIds.includes(size.id));
  };

  if (offer.applicable_to === "all") {
    // Distribute discount proportionally across all items (only eligible sizes)
    const eligibleItems = cartItems.filter(item => hasEligibleSizes(item));
    const totalAmount = eligibleItems.reduce((sum, item) => sum + getItemTotal(item), 0);
    
    if (totalAmount > 0) {
      eligibleItems.forEach(item => {
        const itemTotal = getItemTotal(item);
        if (itemTotal > 0) {
          const itemDiscount = (itemTotal / totalAmount) * totalDiscount;
          itemDiscounts.set(item.productId, itemDiscount);
        }
      });
    }
  } else if (isProductScopedOffer(offer.applicable_to) && offer.applicable_ids) {
    // Calculate discount only for matching products (only eligible sizes)
    const applicableItems = cartItems.filter(item => 
      offer.applicable_ids!.includes(item.productId) && hasEligibleSizes(item)
    );
    const applicableAmount = applicableItems.reduce((sum, item) => 
      sum + getItemTotal(item), 0
    );

    if (applicableAmount > 0) {
      applicableItems.forEach(item => {
        const itemTotal = getItemTotal(item);
        if (itemTotal > 0) {
          const itemDiscount = (itemTotal / applicableAmount) * totalDiscount;
          itemDiscounts.set(item.productId, itemDiscount);
        }
      });
    }
  } else if (isSizeScopedOffer(offer.applicable_to) && offer.applicable_ids) {
    const sizeTotalsByProduct = new Map<string, number>();
    let applicableAmount = 0;

    cartItems.forEach((item) => {
      if (!item.sizes || !Array.isArray(item.sizes)) return;

      const matchingTotal = item.sizes.reduce((sum: number, size: any) => {
        if (!offer.applicable_ids!.includes(size.id)) return sum;
        if (groupPricingSizeIds && groupPricingSizeIds.includes(size.id)) return sum;
        return sum + ((size.price || item.price) * (size.quantity || 1));
      }, 0);

      if (matchingTotal > 0) {
        sizeTotalsByProduct.set(item.productId, matchingTotal);
        applicableAmount += matchingTotal;
      }
    });

    if (applicableAmount > 0) {
      sizeTotalsByProduct.forEach((itemTotal, productId) => {
        const itemDiscount = (itemTotal / applicableAmount) * totalDiscount;
        itemDiscounts.set(productId, itemDiscount);
      });
    }
  } else if (offer.applicable_to === "category" && offer.applicable_ids) {
    // Calculate discount only for matching categories (only eligible sizes)
    const applicableItems = cartItems.filter(item => 
      item.categoryId && offer.applicable_ids!.includes(item.categoryId) && hasEligibleSizes(item)
    );
    const applicableAmount = applicableItems.reduce((sum, item) => 
      sum + getItemTotal(item), 0
    );

    if (applicableAmount > 0) {
      applicableItems.forEach(item => {
        const itemTotal = getItemTotal(item);
        if (itemTotal > 0) {
          const itemDiscount = (itemTotal / applicableAmount) * totalDiscount;
          itemDiscounts.set(item.productId, itemDiscount);
        }
      });
    }
  }

  return itemDiscounts;
}
