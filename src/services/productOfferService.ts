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
export async function getProductEffectivePrice(productId: string): Promise<{
  originalPrice: number;
  effectivePrice: number;
  discountPercent: number;
  offerBadge: string | null;
  hasOffer: boolean;
} | null> {
  try {
    // Try using the database function first
    const { data, error } = await supabase
      .rpc("get_product_effective_price", { p_product_id: productId });

    if (!error && data && data.length > 0) {
      return {
        originalPrice: data[0].original_price,
        effectivePrice: data[0].effective_price,
        discountPercent: data[0].discount_percent,
        offerBadge: data[0].offer_badge,
        hasOffer: data[0].has_offer,
      };
    }

    // Fallback: Calculate manually
    return await calculateProductOffer(productId);
  } catch (error) {
    console.error("Error getting product effective price:", error);
    return null;
  }
}

// Calculate product offer manually (fallback)
async function calculateProductOffer(productId: string): Promise<{
  originalPrice: number;
  effectivePrice: number;
  discountPercent: number;
  offerBadge: string | null;
  hasOffer: boolean;
} | null> {
  try {
    // Get product
    const { data: product } = await supabase
      .from("products")
      .select("id, price, offer_id, offer_price, offer_start_date, offer_end_date, offer_badge")
      .eq("id", productId)
      .single();

    if (!product) return null;

    const now = new Date();

    // Check direct product offer
    if (
      product.offer_id &&
      product.offer_price &&
      product.offer_start_date &&
      product.offer_end_date &&
      new Date(product.offer_start_date) <= now &&
      new Date(product.offer_end_date) >= now
    ) {
      const discountPercent = Math.round(((product.price - product.offer_price) / product.price) * 100);
      return {
        originalPrice: product.price,
        effectivePrice: product.offer_price,
        discountPercent,
        offerBadge: product.offer_badge || `${discountPercent}% OFF`,
        hasOffer: true,
      };
    }

    // Check linked offers
    const { data: productOffers } = await supabase
      .from("product_offers")
      .select(`
        *,
        offers (id, title, offer_type, discount_value, is_active, start_date, end_date)
      `)
      .eq("product_id", productId)
      .eq("is_active", true);

    if (productOffers && productOffers.length > 0) {
      // Find best active offer
      for (const po of productOffers) {
        const offer = po.offers as any;
        if (
          offer &&
          offer.is_active &&
          new Date(offer.start_date) <= now &&
          new Date(offer.end_date) >= now
        ) {
          let effectivePrice = product.price;
          let discountPercent = 0;
          let offerBadge = "";

          if (offer.offer_type === "percentage") {
            effectivePrice = product.price * (1 - offer.discount_value / 100);
            discountPercent = offer.discount_value;
            offerBadge = `${offer.discount_value}% OFF`;
          } else if (offer.offer_type === "flat") {
            effectivePrice = Math.max(product.price - offer.discount_value, 0);
            discountPercent = Math.round((offer.discount_value / product.price) * 100);
            offerBadge = `$${offer.discount_value} OFF`;
          }

          return {
            originalPrice: product.price,
            effectivePrice: Math.round(effectivePrice * 100) / 100,
            discountPercent,
            offerBadge,
            hasOffer: true,
          };
        }
      }
    }

    // No offer
    return {
      originalPrice: product.price,
      effectivePrice: product.price,
      discountPercent: 0,
      offerBadge: null,
      hasOffer: false,
    };
  } catch (error) {
    console.error("Error calculating product offer:", error);
    return null;
  }
}

// Get effective prices for multiple products
export async function getProductsWithOffers(productIds: string[]): Promise<Map<string, {
  effectivePrice: number;
  discountPercent: number;
  offerBadge: string | null;
  hasOffer: boolean;
}>> {
  const results = new Map();

  try {
    // Get all products
    const { data: products } = await supabase
      .from("products")
      .select("id, price, offer_id, offer_price, offer_start_date, offer_end_date, offer_badge")
      .in("id", productIds);

    if (!products) return results;

    // Get all product offers
    const { data: productOffers } = await supabase
      .from("product_offers")
      .select(`
        product_id,
        offer_price,
        offers (id, offer_type, discount_value, is_active, start_date, end_date)
      `)
      .in("product_id", productIds)
      .eq("is_active", true);

    const now = new Date();

    for (const product of products) {
      let effectivePrice = product.price;
      let discountPercent = 0;
      let offerBadge: string | null = null;
      let hasOffer = false;

      // Check direct product offer
      if (
        product.offer_id &&
        product.offer_price &&
        product.offer_start_date &&
        product.offer_end_date &&
        new Date(product.offer_start_date) <= now &&
        new Date(product.offer_end_date) >= now
      ) {
        effectivePrice = product.offer_price;
        discountPercent = Math.round(((product.price - product.offer_price) / product.price) * 100);
        offerBadge = product.offer_badge || `${discountPercent}% OFF`;
        hasOffer = true;
      } else if (productOffers) {
        // Check linked offers
        const linkedOffer = productOffers.find(po => {
          const offer = po.offers as any;
          return (
            po.product_id === product.id &&
            offer &&
            offer.is_active &&
            new Date(offer.start_date) <= now &&
            new Date(offer.end_date) >= now
          );
        });

        if (linkedOffer) {
          const offer = linkedOffer.offers as any;
          if (offer.offer_type === "percentage") {
            effectivePrice = product.price * (1 - offer.discount_value / 100);
            discountPercent = offer.discount_value;
            offerBadge = `${offer.discount_value}% OFF`;
          } else if (offer.offer_type === "flat") {
            effectivePrice = Math.max(product.price - offer.discount_value, 0);
            discountPercent = Math.round((offer.discount_value / product.price) * 100);
            offerBadge = `$${offer.discount_value} OFF`;
          }
          hasOffer = true;
        }
      }

      results.set(product.id, {
        effectivePrice: Math.round(effectivePrice * 100) / 100,
        discountPercent,
        offerBadge,
        hasOffer,
      });
    }
  } catch (error) {
    console.error("Error getting products with offers:", error);
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
      .select("id, name, price, offer_price, offer_badge")
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
        products (id, name, price),
        offers (offer_type, discount_value)
      `)
      .eq("is_active", true)
      .limit(limit);

    const results: ProductWithOffer[] = [];

    // Add direct offer products
    if (directOfferProducts) {
      for (const p of directOfferProducts) {
        const discountPercent = Math.round(((p.price - p.offer_price) / p.price) * 100);
        results.push({
          id: p.id,
          name: p.name,
          price: p.price,
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
          let effectivePrice = product.price;
          let discountPercent = 0;
          let offerBadge = "";

          if (offer.offer_type === "percentage") {
            effectivePrice = product.price * (1 - offer.discount_value / 100);
            discountPercent = offer.discount_value;
            offerBadge = `${offer.discount_value}% OFF`;
          } else if (offer.offer_type === "flat") {
            effectivePrice = Math.max(product.price - offer.discount_value, 0);
            discountPercent = Math.round((offer.discount_value / product.price) * 100);
            offerBadge = `$${offer.discount_value} OFF`;
          }

          results.push({
            id: product.id,
            name: product.name,
            price: product.price,
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
