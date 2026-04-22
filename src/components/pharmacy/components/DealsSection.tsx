"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useSelector } from "react-redux";
import { selectUserProfile } from "@/store/selectors/userSelectors";
import {
  hasAnyActiveSpecialPricing,
  getSpecialPricingProductIdsForProducts,
  getSpecialPricingSizeMap,
} from "@/services/specialPricingService";
import {
  Clock,
  Flame,
  ChevronRight,
  Zap,
  ShoppingCart,
} from "lucide-react";

interface DealProduct {
  id: string;
  product_id: string;
  name: string;
  image_url: string;
  base_price: number;
  original_price: number;
  discount_percent: number;
  offer_badge: string;
  product_name?: string;
}

interface DealsSettings {
  is_enabled: boolean;
  section_title: string;
  section_subtitle: string;
  countdown_enabled: boolean;
  max_products: number;
}

interface DealSizeRow {
  id: string;
  size_name: string | null;
  size_value: string | null;
  size_unit: string | null;
  price: number | null;
  image: string | null;
}

interface DealProductRow {
  id: string;
  name: string;
  base_price: number | null;
  image_url: string | null;
  unitToggle: boolean | null;
  product_sizes?: DealSizeRow[] | null;
}

interface DealOfferRow {
  applicable_to: string | null;
  applicable_ids: string[] | null;
}

interface DailyDealRow {
  id: string;
  discount_percent: number;
  badge_type: string;
  products: DealProductRow | null;
  offers: DealOfferRow | null;
}

const getSizeLabel = (size: DealSizeRow, unitToggle?: boolean | null) => {
  const parts = [
    size.size_name,
    size.size_value,
    unitToggle ? size.size_unit : null,
  ]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .map((part) => part!.trim());

  return parts.join(" ").trim() || "Unnamed Size";
};

const getProductImageUrl = (image?: string | null) => {
  const basePath = "https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/";

  if (!image) {
    return "/placeholder.svg";
  }

  if (image.startsWith("http")) {
    return image;
  }

  return `${basePath}${image}`;
};

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const DealsSection = () => {
  const navigate = useNavigate();
  const userProfile = useSelector(selectUserProfile);
  const isLoggedIn = sessionStorage.getItem("isLoggedIn") === "true";
  const [deals, setDeals] = useState<DealProduct[]>([]);
  const [settings, setSettings] = useState<DealsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const openInlineProduct = (productId: string) => {
    const userType = sessionStorage.getItem("userType")?.toLowerCase() || "pharmacy";
    navigate(`/${userType}/products`, {
      state: {
        selectedProductId: String(productId),
      },
    });
  };

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();

      if (diff > 0) {
        setTimeLeft({
          hours: Math.floor(diff / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isActive = true;

    const fetchDealsAndSettings = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const viewerId = userProfile?.id || user?.id || null;

        if (isLoggedIn && !viewerId) {
          if (isActive) {
            setLoading(true);
          }
          return;
        }

        if (viewerId && await hasAnyActiveSpecialPricing(viewerId)) {
          if (isActive) {
            setDeals([]);
            setLoading(false);
          }
          return;
        }

        const { data: settingsData } = await supabase
          .from("daily_deals_settings")
          .select("*")
          .maybeSingle();

        if (settingsData) {
          setSettings(settingsData);

          if (settingsData.is_enabled) {
            if (isActive) {
              setDeals([]);
            }

            const now = new Date().toISOString();
            const { data: dealsData } = await supabase
              .from("daily_deals")
              .select(`
                id,
                discount_percent,
                badge_type,
                offers (applicable_to, applicable_ids),
                products (id, name, base_price, image_url, unitToggle, product_sizes(id, size_name, size_value, size_unit, price, image))
              `)
              .eq("is_active", true)
              .lte("start_date", now)
              .gte("end_date", now)
              .order("display_order", { ascending: true })
              .limit(settingsData.max_products || 6);

            if (dealsData) {
              const dealRows = dealsData as DailyDealRow[];
              const productRows = dealRows
                .map((deal) => deal.products)
                .filter((product): product is DealProductRow => Boolean(product));
              const productIds = productRows.map((product) => product.id);
              const sizeIds = productRows.flatMap((product) =>
                (product.product_sizes || []).map((size) => size.id)
              );
              const specialPricingProductIds = viewerId
                ? await getSpecialPricingProductIdsForProducts(viewerId, productIds)
                : new Set<string>();
              const specialPricingSizeMap = viewerId
                ? await getSpecialPricingSizeMap(viewerId, sizeIds)
                : new Map<string, number>();

              const formattedDeals = (dealsData as DailyDealRow[])
                .filter((deal) => deal.products)
                .flatMap((deal) => {
                  if (deal.products?.id && specialPricingProductIds.has(deal.products.id)) {
                    return [];
                  }

                  const targetedSizes =
                    deal.offers?.applicable_to === "specific_product" && deal.offers.applicable_ids?.length
                      ? (deal.products?.product_sizes || []).filter((size) =>
                          deal.offers?.applicable_ids?.includes(size.id)
                        )
                      : [];

                  if (targetedSizes.length > 0) {
                    return targetedSizes.map((targetedSize) => {
                      if (specialPricingSizeMap.has(targetedSize.id)) {
                        return null;
                      }

                      const originalPrice = Number(targetedSize.price ?? 0);
                      const discountedPrice =
                        originalPrice > 0
                          ? roundCurrency(originalPrice * (1 - deal.discount_percent / 100))
                          : 0;

                      return {
                        id: targetedSize.id,
                        product_id: deal.products!.id,
                        name: getSizeLabel(targetedSize, deal.products?.unitToggle),
                        product_name: deal.products?.name,
                        image_url: getProductImageUrl(targetedSize.image || deal.products?.image_url),
                        original_price: originalPrice,
                        base_price: discountedPrice,
                        discount_percent: deal.discount_percent,
                        offer_badge: deal.badge_type,
                      };
                    }).filter((dealProduct): dealProduct is DealProduct => Boolean(dealProduct));
                  }

                  const originalPrice = Number(deal.products?.base_price ?? 0);
                  const discountedPrice =
                    originalPrice > 0
                      ? roundCurrency(originalPrice * (1 - deal.discount_percent / 100))
                      : 0;

                  return [{
                    id: deal.id,
                    product_id: deal.products!.id,
                    name: deal.products?.name || "Product",
                    image_url: getProductImageUrl(deal.products?.image_url),
                    original_price: originalPrice,
                    base_price: discountedPrice,
                    discount_percent: deal.discount_percent,
                    offer_badge: deal.badge_type,
                    }];
                });

              if (isActive) {
                setDeals(formattedDeals.slice(0, 5));
              }
            }
          }
        } else {
          if (isActive) {
            setSettings({
              is_enabled: false,
              section_title: "Deals of the Day",
              section_subtitle: "Limited time offers - Don't miss out!",
              countdown_enabled: true,
              max_products: 6,
            });
          }
        }
      } catch (error) {
        console.error("Error fetching deals:", error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchDealsAndSettings();

    return () => {
      isActive = false;
    };
  }, [isLoggedIn, userProfile?.id]);

  if (!settings?.is_enabled) return null;

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-48 flex-shrink-0">
                <div className="h-32 bg-gray-200 rounded-lg animate-pulse mb-2" />
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (deals.length === 0) return null;

  return (
    <Card className="border-0 shadow-xl bg-white overflow-hidden my-8">
      <CardContent className="p-0">
        <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 px-6 py-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl shadow-lg">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                {settings?.section_title || "Deals of the Day"}
                <Zap className="h-5 w-5 text-yellow-300" />
              </h3>
              <p className="text-orange-100 text-sm">
                {settings?.section_subtitle || "Limited time offers - Don't miss out!"}
              </p>
            </div>
          </div>

          {settings?.countdown_enabled && (
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-white" />
              <div className="flex gap-1.5">
                <div className="bg-white/25 backdrop-blur-md rounded-lg px-3 py-2 text-center min-w-[50px] shadow-lg">
                  <span className="text-xl font-bold text-white block">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </span>
                  <p className="text-[9px] text-orange-100 uppercase tracking-wide">Hrs</p>
                </div>
                <span className="text-white/60 text-xl font-bold self-center">:</span>
                <div className="bg-white/25 backdrop-blur-md rounded-lg px-3 py-2 text-center min-w-[50px] shadow-lg">
                  <span className="text-xl font-bold text-white block">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </span>
                  <p className="text-[9px] text-orange-100 uppercase tracking-wide">Min</p>
                </div>
                <span className="text-white/60 text-xl font-bold self-center">:</span>
                <div className="bg-white/25 backdrop-blur-md rounded-lg px-3 py-2 text-center min-w-[50px] shadow-lg">
                  <span className="text-xl font-bold text-white block">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                  <p className="text-[9px] text-orange-100 uppercase tracking-wide">Sec</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-gradient-to-b from-orange-50/30 to-white">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {deals.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0 w-52 bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-gray-100"
                onClick={() => openInlineProduct(product.product_id)}
              >
                <div className="relative h-40 overflow-hidden rounded-t-xl bg-gray-100 p-3">
                  <img
                    src={product.image_url || "https://placehold.co/400x300/e5e7eb/6b7280?text=No+Image"}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = "https://placehold.co/400x300/e5e7eb/6b7280?text=No+Image";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white border-0 text-sm font-bold shadow-lg">
                    {product.discount_percent}%
                  </Badge>
                  {product.offer_badge && (
                    <Badge className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 border-0 text-[10px] font-bold shadow-lg">
                      {product.offer_badge}
                    </Badge>
                  )}
                </div>

                <div className="p-3.5">
                  {product.product_name && (
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {product.product_name}
                    </p>
                  )}
                  <h4 className="font-semibold text-sm text-gray-900 mb-2.5 group-hover:text-blue-600 transition-colors leading-tight h-[60px] flex items-start">
                    <span className="line-clamp-3">{product.name}</span>
                  </h4>

                  <div className="mb-3">
                    {product.base_price > 0 ? (
                      <div className="space-y-0.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-green-600">
                            ${product.base_price.toFixed(2)}
                          </span>
                          {product.original_price > 0 && (
                            <span className="text-sm text-gray-400 line-through">
                              ${product.original_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {product.original_price > 0 && (
                          <p className="text-xs text-green-600 font-medium">
                            Save ${(product.original_price - product.base_price).toFixed(2)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-lg font-semibold text-gray-500">View Deal</span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md group-hover:shadow-lg transition-all duration-300"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    View Deal
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700"
              onClick={() => navigate("/pharmacy/deals")}
            >
              View All Deals
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
