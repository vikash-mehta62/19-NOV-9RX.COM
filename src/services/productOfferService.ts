// Product Offer Service - Get product prices with offers applied
import { supabase } from "@/integrations/supabase/client";

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
    // Use the new database function that handles all offer types
    const { data, error } = await supabase
      .rpc("get_product_price_with_offers", { 
        p_product_id: productId,
        p_user_id: userId || null
      });

    if (!error && data && data.length > 0) {
      return {
        originalPrice: data[0].original_price,
        effectivePrice: data[0].effective_price,
        discountPercent: data[0].discount_percent,
        offerBadge: data[0].offer_badge,
        hasOffer: data[0].has_offer,
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
  const results = new Map();

  try {
    console.log("🔍 Fetching offers for products:", productIds.length, "products");
    console.log("👤 User ID:", userId || "No user ID provided");

    // Use the new database function that handles all offer types
    const offerPromises = productIds.map(async (productId) => {
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
        const offerData = data[0];
        if (offerData.has_offer) {
          console.log(`✅ Product ${productId} has offer:`, {
            badge: offerData.offer_badge,
            discount: offerData.discount_percent,
            effectivePrice: offerData.effective_price
          });
        }
        return {
          productId,
          effectivePrice: offerData.effective_price,
          discountPercent: offerData.discount_percent,
          offerBadge: offerData.offer_badge,
          hasOffer: offerData.has_offer,
        };
      }

      console.log(`⚠️ No offer data returned for product ${productId}`);
      return null;
    });

    const offerResults = await Promise.all(offerPromises);

    // Build the results map
    offerResults.forEach((result) => {
      if (result) {
        results.set(result.productId, {
          effectivePrice: result.effectivePrice,
          discountPercent: result.discountPercent,
          offerBadge: result.offerBadge,
          hasOffer: result.hasOffer,
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
        const product = po.products as any;
        const offer = po.offers as any;
        
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
  sizeId: string
): Promise<{
  offerBadge: string | null;
  hasOffer: boolean;
  discountPercent: number;
  effectivePrice?: number;
} | null> {
  try {
    // Get parent product offer
    const parentOffer = await getProductEffectivePrice(productId);
    
    if (!parentOffer || !parentOffer.hasOffer) {
      return {
        offerBadge: null,
        hasOffer: false,
        discountPercent: 0
      };
    }

    // Get the size price
    const { data: sizeData } = await supabase
      .from('product_sizes')
      .select('price')
      .eq('id', sizeId)
      .single();

    if (!sizeData) {
      return {
        offerBadge: parentOffer.offerBadge,
        hasOffer: true,
        discountPercent: parentOffer.discountPercent
      };
    }

    // Calculate effective price for this size using parent discount
    const sizePrice = sizeData.price;
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
