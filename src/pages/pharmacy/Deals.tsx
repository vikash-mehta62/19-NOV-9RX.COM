import { useState, useEffect } from "react";
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
import { Clock, Flame, ShoppingCart, ArrowLeft, Menu, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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

export default function Deals() {
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

  // Countdown timer - ends at midnight
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

        // Fetch settings
        const { data: settingsData } = await supabase
          .from("daily_deals_settings")
          .select("*")
          .maybeSingle();

        if (settingsData) {
          if (isActive) {
            setSettings(settingsData);
          }
          
          // Fetch all active deals (no limit for this page)
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
              .order("display_order", { ascending: true });

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
                .filter(d => d.products)
                .flatMap((d) => {
                  if (d.products?.id && specialPricingProductIds.has(d.products.id)) {
                    return [];
                  }

                  const targetedSizes =
                    d.offers?.applicable_to === "specific_product" && d.offers.applicable_ids?.length
                      ? (d.products?.product_sizes || []).filter((size) =>
                          d.offers?.applicable_ids?.includes(size.id)
                        )
                      : [];

                  if (targetedSizes.length > 0) {
                    return targetedSizes.map((targetedSize) => {
                      if (specialPricingSizeMap.has(targetedSize.id)) {
                        return null;
                      }

                      const basePrice = Number(targetedSize.price ?? 0);
                      const discountedPrice =
                        basePrice > 0
                          ? roundCurrency(basePrice * (1 - d.discount_percent / 100))
                          : 0;

                      return {
                        id: targetedSize.id,
                        product_id: d.products!.id,
                        name: getSizeLabel(targetedSize, d.products?.unitToggle),
                        product_name: d.products?.name,
                        image_url: getProductImageUrl(targetedSize.image || d.products?.image_url),
                        original_price: basePrice,
                        base_price: discountedPrice,
                        discount_percent: d.discount_percent,
                        offer_badge: d.badge_type,
                      };
                    }).filter((dealProduct): dealProduct is DealProduct => Boolean(dealProduct));
                  }

                  const basePrice = Number(d.products?.base_price ?? 0);
                  const discountedPrice =
                    basePrice > 0
                      ? roundCurrency(basePrice * (1 - d.discount_percent / 100))
                      : 0;

                  return [{
                    id: d.id,
                    product_id: d.products!.id,
                    name: d.products?.name || "Product",
                    image_url: getProductImageUrl(d.products?.image_url),
                    original_price: basePrice,
                    base_price: discountedPrice,
                    discount_percent: d.discount_percent,
                    offer_badge: d.badge_type,
                  }];
                });
              if (isActive) {
                setDeals(formattedDeals);
              }
            }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="h-40 bg-gradient-to-r from-orange-200 to-red-200 rounded-xl animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-56 bg-gray-200 animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="h-10 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!settings?.is_enabled || deals.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/pharmacy/products")}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </div>
        </div>
        <div className="container mx-auto px-4 py-16">
          <Card className="border-0 shadow-xl">
            <CardContent className="p-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="bg-gradient-to-br from-orange-100 to-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Flame className="h-12 w-12 text-orange-500" />
                </div>
                <h2 className="text-3xl font-bold mb-3 text-gray-900">No Active Deals</h2>
                <p className="text-gray-600 mb-8 text-lg">
                  Check back later for amazing deals and discounts!
                </p>
                <Button 
                  size="lg"
                  onClick={() => navigate("/pharmacy/products")}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  Browse All Products
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate("/pharmacy/products")}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
            <div className="text-sm text-gray-600">
              {deals.length} {deals.length === 1 ? 'Deal' : 'Deals'} Available
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-8">
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 px-6 md:px-8 py-6 md:py-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                {/* Title Section */}
                <div className="flex items-start gap-4">
                  <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg">
                    <Flame className="h-8 w-8 md:h-10 md:w-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-1 flex items-center gap-2">
                      {settings?.section_title || "Deals of the Day"}
                      <span className="text-yellow-300">⚡</span>
                    </h1>
                    <p className="text-orange-100 text-sm md:text-base">
                      {settings?.section_subtitle || "Limited time offers - Don't miss out!"}
                    </p>
                  </div>
                </div>

                {/* Countdown Timer */}
                {settings?.countdown_enabled && (
                  <div className="flex flex-col items-start md:items-end gap-2">
                    <div className="flex items-center gap-2 text-white/90 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>Ends in</span>
                    </div>
                    <div className="flex gap-2">
                      <div className="bg-white/25 backdrop-blur-md rounded-lg px-3 py-2 text-center min-w-[55px] shadow-lg">
                        <span className="text-2xl md:text-3xl font-bold text-white block">
                          {String(timeLeft.hours).padStart(2, "0")}
                        </span>
                        <p className="text-[10px] text-orange-100 uppercase tracking-wide">Hours</p>
                      </div>
                      <div className="flex items-center">
                        <span className="text-white/60 text-2xl font-bold">:</span>
                      </div>
                      <div className="bg-white/25 backdrop-blur-md rounded-lg px-3 py-2 text-center min-w-[55px] shadow-lg">
                        <span className="text-2xl md:text-3xl font-bold text-white block">
                          {String(timeLeft.minutes).padStart(2, "0")}
                        </span>
                        <p className="text-[10px] text-orange-100 uppercase tracking-wide">Mins</p>
                      </div>
                      <div className="flex items-center">
                        <span className="text-white/60 text-2xl font-bold">:</span>
                      </div>
                      <div className="bg-white/25 backdrop-blur-md rounded-lg px-3 py-2 text-center min-w-[55px] shadow-lg">
                        <span className="text-2xl md:text-3xl font-bold text-white block">
                          {String(timeLeft.seconds).padStart(2, "0")}
                        </span>
                        <p className="text-[10px] text-orange-100 uppercase tracking-wide">Secs</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Deals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
          {deals.map((product) => {
            return (
              <Card
                key={product.id}
                className="group overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 bg-white"
                      onClick={() => openInlineProduct(product.product_id)}
              >
                {/* Image Container */}
                <div className="relative h-56 overflow-hidden bg-gray-100 p-4">
                  <img
                    src={product.image_url || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                  
                  {/* Gradient Overlay on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                    <Badge className="bg-red-500 hover:bg-red-600 text-white border-0 text-sm font-bold shadow-lg">
                      {product.discount_percent}% OFF
                    </Badge>
                    {product.offer_badge && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 border-0 text-xs font-bold shadow-lg">
                        {product.offer_badge}
                      </Badge>
                    )}
                  </div>

                  {/* Quick View Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-xs text-center">Click to view details</p>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-4">
                  {product.product_name && (
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {product.product_name}
                    </p>
                  )}
                  <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-3 group-hover:text-blue-600 transition-colors min-h-[40px] leading-tight">
                    {product.name}
                  </h3>
                  
                  {/* Price Section */}
                  <div className="mb-4">
                    {product.base_price > 0 ? (
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-emerald-600">
                            ${product.base_price.toFixed(2)}
                          </span>
                          {product.original_price > 0 && (
                            <span className="text-sm text-gray-400 line-through">
                              ${product.original_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {product.original_price > 0 && (
                          <p className="text-xs text-emerald-600 font-medium">
                            Save ${(product.original_price - product.base_price).toFixed(2)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="py-2">
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                          View Sizes & Prices
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      openInlineProduct(product.id);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {product.base_price > 0 ? 'View Deal' : 'View Product'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {deals.length === 0 && (
          <Card className="border-0 shadow-xl mt-8">
            <CardContent className="p-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="bg-gradient-to-br from-orange-100 to-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Flame className="h-12 w-12 text-orange-500" />
                </div>
                <h2 className="text-3xl font-bold mb-3 text-gray-900">No Active Deals</h2>
                <p className="text-gray-600 mb-8 text-lg">
                  Check back later for amazing deals and discounts!
                </p>
                <Button 
                  size="lg"
                  onClick={() => navigate("/pharmacy/products")}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                >
                  Browse All Products
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
