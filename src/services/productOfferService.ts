// Product Offer Service - Get product prices with offers applied
import { supabase } from "@/integrations/supabase/client";
import {
  hasAnyActiveSpecialPricing,
  getSpecialPricingProductIdsForProducts,
  hasSpecialPricingForProduct,
  hasSpecialPricingForSize,
} from "@/services/specialPricingService";

type OfferApplicableTo = "all" | "category" | "product" | "user_group" | "first_order" | string;

interface ProductPriceOfferRpcRow {
  original_price: number;
  effective_price: number;
  discount_percent: number;
  offer_badge: string | null;
  has_offer: boolean;
  offer_id: string | null;
}

interface SizeOfferResult {
  offerBadge: string | null;
  hasOffer: boolean;
  discountPercent: number;
  effectivePrice?: number;
}

const CHECKOUT_ONLY_APPLICABLE_TO = new Set<OfferApplicableTo>(["user_group", "first_order"]);
const offerApplicableToCache = new Map<string, OfferApplicableTo | null>();

const isCheckoutOnlyOfferType = (applicableTo?: string | null) => {
  if (!applicableTo) return false;
  return CHECKOUT_ONLY_APPLICABLE_TO.has(applicableTo);
};

const getUniqueIds = (ids: Array<string | null | undefined>) =>
  Array.from(new Set(ids.filter((id): id is string => Boolean(id))));

async function getOfferApplicableToMap(
  offerIds: string[]
): Promise<Map<string, OfferApplicableTo | null>> {
  const result = new Map<string, OfferApplicableTo | null>();
  if (offerIds.length === 0) return result;

  const missingIds = offerIds.filter((id) => !offerApplicableToCache.has(id));

  if (missingIds.length > 0) {
    const { data, error } = await supabase
      .from("offers")
      .select("id, applicable_to")
      .in("id", missingIds);

    if (error) {
      console.error("Failed to load offer applicable_to types:", error);
    } else {
      const rows = (data || []) as Array<{ id: string; applicable_to: string | null }>;
      const seen = new Set<string>();

      rows.forEach((row) => {
        seen.add(row.id);
        offerApplicableToCache.set(row.id, row.applicable_to);
      });

      missingIds.forEach((id) => {
        if (!seen.has(id)) {
          offerApplicableToCache.set(id, null);
        }
      });
    }
  }

  offerIds.forEach((id) => {
    result.set(id, offerApplicableToCache.get(id) ?? null);
  });

  return result;
}

interface ProductWithOffer {
  id: string;
  name: string;
  price: number;
  effectivePrice: number;
  discountPercent: number;
  offerBadge: string | null;
  hasOffer: boolean;
}

interface ProductOffer {
  product_id: string;
  offer_id: string;
  offer_price: number | null;
  offers: {
    id: string;
    title: string;
    offer_type: string;
    discount_value: number;
    is_active: boolean;
    start_date: string;
    end_date: string;
  };
}

// Get effective price for a single product
export async function getProductEffectivePrice(
  productId: string,
  userId?: string
): Promise<{
  originalPrice: number;
  effectivePrice: number;
  discountPercent: number;
  offerBadge: string | null;
  hasOffer: boolean;
} | null> {
  try {
    if (userId && await hasAnyActiveSpecialPricing(userId)) {
      return null;
    }

    if (userId && await hasSpecialPricingForProduct(userId, productId)) {
      return null;
    }

    // Use the new database function that handles all offer types
    const { data, error } = await supabase
      .rpc("get_product_price_with_offers", { 
        p_product_id: productId,
        p_user_id: userId || null
      });

    if (!error && data && data.length > 0) {
      const row = data[0] as ProductPriceOfferRpcRow;
      let hasOffer = row.has_offer;
      let effectivePrice = row.effective_price;
      let discountPercent = row.discount_percent;
      let offerBadge = row.offer_badge;

      if (hasOffer && row.offer_id) {
        const applicableTypeMap = await getOfferApplicableToMap([row.offer_id]);
        const applicableTo = applicableTypeMap.get(row.offer_id);

        // user_group and first_order offers should be visible only in checkout flow.
        if (isCheckoutOnlyOfferType(applicableTo)) {
          hasOffer = false;
          effectivePrice = row.original_price;
          discountPercent = 0;
          offerBadge = null;
        }
      }

      return {
        originalPrice: row.original_price,
        effectivePrice,
        discountPercent,
        offerBadge,
        hasOffer,
      };
    }

    // No offer found
    return null;
  } catch (error) {
    console.error("Error getting product effective price:", error);
    return null;
  }
}

// Get effective prices for multiple products (including all offer types)
export async function getProductsWithOffers(
  productIds: string[],
  userId?: string
): Promise<Map<string, {
  effectivePrice: number;
  discountPercent: number;
  offerBadge: string | null;
  hasOffer: boolean;
}>> {
  const results = new Map<string, {
    effectivePrice: number;
    discountPercent: number;
    offerBadge: string | null;
    hasOffer: boolean;
  }>();

  try {
    if (userId && await hasAnyActiveSpecialPricing(userId)) {
      return results;
    }

    const specialPricingProductIds = userId
      ? await getSpecialPricingProductIdsForProducts(userId, productIds)
      : new Set<string>();
    console.log("🔍 Fetching offers for products:", productIds.length, "products");
    console.log("👤 User ID:", userId || "No user ID provided");

    // Use the new database function that handles all offer types
    const offerPromises = productIds.map(async (productId) => {
      if (specialPricingProductIds.has(productId)) {
        return {
          productId,
          originalPrice: 0,
          effectivePrice: 0,
          discountPercent: 0,
          offerBadge: null,
          hasOffer: false,
          offerId: null,
        };
      }

      const { data, error } = await supabase
        .rpc("get_product_price_with_offers", { 
          p_product_id: productId,
          p_user_id: userId || null
        });

      if (error) {
        console.error(`❌ Error getting offers for product ${productId}:`, error);
        return null;
      }

      if (data && data.length > 0) {
        const offerData = data[0] as ProductPriceOfferRpcRow;
        if (offerData.has_offer) {
          console.log(`✅ Product ${productId} has offer:`, {
            badge: offerData.offer_badge,
            discount: offerData.discount_percent,
            effectivePrice: offerData.effective_price
          });
        }
        return {
          productId,
          originalPrice: offerData.original_price,
          effectivePrice: offerData.effective_price,
          discountPercent: offerData.discount_percent,
          offerBadge: offerData.offer_badge,
          hasOffer: offerData.has_offer,
          offerId: offerData.offer_id,
        };
      }

      console.log(`⚠️ No offer data returned for product ${productId}`);
      return null;
    });

    const offerResults = await Promise.all(offerPromises);
    const applicableTypeMap = await getOfferApplicableToMap(
      getUniqueIds(
        offerResults
          .filter((result) => result?.hasOffer)
          .map((result) => result?.offerId)
      )
    );

    // Build the results map
    offerResults.forEach((result) => {
      if (result) {
        const applicableTo = result.offerId ? applicableTypeMap.get(result.offerId) : null;
        const isCheckoutOnly = result.hasOffer && isCheckoutOnlyOfferType(applicableTo);

        results.set(result.productId, {
          effectivePrice: isCheckoutOnly ? result.originalPrice : result.effectivePrice,
          discountPercent: isCheckoutOnly ? 0 : result.discountPercent,
          offerBadge: isCheckoutOnly ? null : result.offerBadge,
          hasOffer: isCheckoutOnly ? false : result.hasOffer,
        });
      }
    });

    console.log("📊 Final offers map size:", results.size);
    const offersWithBadges = Array.from(results.entries()).filter(([_, offer]) => offer.hasOffer);
    console.log(`🎯 Products with offers: ${offersWithBadges.length}/${results.size}`);
  } catch (error) {
    console.error("💥 Error getting products with offers:", error);
  }

  return results;
}

// Get all products with active offers (for displaying on sale page)
export async function getProductsOnSale(limit: number = 50): Promise<ProductWithOffer[]> {
  try {
    const now = new Date().toISOString();

    // Get products with direct offers
    const { data: directOfferProducts } = await supabase
      .from("products")
      .select("id, name, base_price, offer_price, offer_badge")
      .not("offer_id", "is", null)
      .not("offer_price", "is", null)
      .lte("offer_start_date", now)
      .gte("offer_end_date", now)
      .eq("is_active", true)
      .limit(limit);

    // Get products with linked offers
    const { data: linkedOfferProducts } = await supabase
      .from("product_offers")
      .select(`
        product_id,
        products (id, name, base_price),
        offers (offer_type, discount_value)
      `)
      .eq("is_active", true)
      .limit(limit);

    const results: ProductWithOffer[] = [];

    // Add direct offer products
    if (directOfferProducts) {
      for (const p of directOfferProducts) {
        const price = p.base_price || 0;
        const discountPercent = Math.round(((price - p.offer_price) / price) * 100);
        results.push({
          id: p.id,
          name: p.name,
          price: price,
          effectivePrice: p.offer_price,
          discountPercent,
          offerBadge: p.offer_badge || `${discountPercent}% OFF`,
          hasOffer: true,
        });
      }
    }

    // Add linked offer products (avoid duplicates)
    if (linkedOfferProducts) {
      for (const po of linkedOfferProducts) {
        const product = po.products as { id: string; name: string; base_price: number | null } | null;
        const offer = po.offers as { offer_type: string; discount_value: number } | null;
        
        if (product && offer && !results.find(r => r.id === product.id)) {
          const price = product.base_price || 0;
          let effectivePrice = price;
          let discountPercent = 0;
          let offerBadge = "";

          if (offer.offer_type === "percentage") {
            effectivePrice = price * (1 - offer.discount_value / 100);
            discountPercent = offer.discount_value;
            offerBadge = `${offer.discount_value}% OFF`;
          } else if (offer.offer_type === "flat") {
            effectivePrice = Math.max(price - offer.discount_value, 0);
            discountPercent = Math.round((offer.discount_value / price) * 100);
            offerBadge = `${offer.discount_value} OFF`;
          }

          results.push({
            id: product.id,
            name: product.name,
            price: price,
            effectivePrice: Math.round(effectivePrice * 100) / 100,
            discountPercent,
            offerBadge,
            hasOffer: true,
          });
        }
      }
    }

    return results;
  } catch (error) {
    console.error("Error getting products on sale:", error);
    return [];
  }
}

// Get offer information for size variants (inherits from parent product)
export async function getSizeVariantOffer(
  productId: string,
  sizeId: string,
  userId?: string
): Promise<SizeOfferResult | null> {
  try {
    if (userId && await hasAnyActiveSpecialPricing(userId)) {
      return {
        offerBadge: null,
        hasOffer: false,
        discountPercent: 0,
      };
    }

    if (userId && await hasSpecialPricingForSize(userId, sizeId)) {
      return {
        offerBadge: null,
        hasOffer: false,
        discountPercent: 0,
      };
    }

    const { data: sizeData, error: sizeError } = await supabase
      .from('product_sizes')
      .select('price')
      .eq('id', sizeId)
      .single();

    if (sizeError || !sizeData) {
      return null;
    }

    const now = new Date().toISOString();

    const { data: sizeScopedOffers, error: sizeOfferError } = await supabase
      .from('offers')
      .select('id, offer_type, discount_value, applicable_to')
      .eq('applicable_to', 'specific_product')
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .contains('applicable_ids', [sizeId])
      .order('discount_value', { ascending: false })
      .limit(1);

    if (!sizeOfferError && sizeScopedOffers && sizeScopedOffers.length > 0) {
      const sizeOffer = sizeScopedOffers[0] as {
        offer_type: string;
        discount_value: number;
      };
      const sizePrice = Number(sizeData.price) || 0;

      if (sizeOffer.offer_type === 'percentage') {
        return {
          offerBadge: `${sizeOffer.discount_value}% OFF`,
          hasOffer: true,
          discountPercent: sizeOffer.discount_value,
          effectivePrice: Math.round(sizePrice * (1 - sizeOffer.discount_value / 100) * 100) / 100,
        };
      }

      if (sizeOffer.offer_type === 'flat') {
        const effectivePrice = Math.max(sizePrice - sizeOffer.discount_value, 0);
        const discountPercent = sizePrice > 0
          ? Math.round((sizeOffer.discount_value / sizePrice) * 100)
          : 0;

        return {
          offerBadge: `$${sizeOffer.discount_value} OFF`,
          hasOffer: true,
          discountPercent,
          effectivePrice: Math.round(effectivePrice * 100) / 100,
        };
      }
    }

    // Get parent product offer
    const parentOffer = await getProductEffectivePrice(productId, userId);
    
    if (!parentOffer || !parentOffer.hasOffer) {
      return {
        offerBadge: null,
        hasOffer: false,
        discountPercent: 0
      };
    }

    // Calculate effective price for this size using parent discount
    const sizePrice = Number(sizeData.price) || 0;
    const effectivePrice = sizePrice * (1 - parentOffer.discountPercent / 100);

    // Return offer info for size variant
    return {
      offerBadge: parentOffer.offerBadge,
      hasOffer: true,
      discountPercent: parentOffer.discountPercent,
      effectivePrice: Math.round(effectivePrice * 100) / 100
    };
  } catch (error) {
    console.error("Error getting size variant offer:", error);
    return null;
  }
}

// Export CartItem type for use in other services
export interface CartItem {
  productId: string;
  categoryId?: string;
  price: number;
  quantity: number;
}
