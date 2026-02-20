"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Flame,
  ChevronRight,
  Zap,
  ShoppingCart,
} from "lucide-react";

interface DealProduct {
  id: string;
  name: string;
  image_url: string;
  base_price: number;
  original_price: number;
  discount_percent: number;
  offer_badge: string;
}

interface DealsSettings {
  is_enabled: boolean;
  section_title: string;
  section_subtitle: string;
  countdown_enabled: boolean;
  max_products: number;
}

export const DealsSection = () => {
  const navigate = useNavigate();
  const [deals, setDeals] = useState<DealProduct[]>([]);
  const [settings, setSettings] = useState<DealsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

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
    const fetchDealsAndSettings = async () => {
      try {
        // Fetch settings first
        const { data: settingsData } = await supabase
          .from("daily_deals_settings")
          .select("*")
          .maybeSingle();

        if (settingsData) {
          setSettings(settingsData);
          
          // Only fetch deals if section is enabled
          if (settingsData.is_enabled) {
            const now = new Date().toISOString();
            const { data: dealsData } = await supabase
              .from("daily_deals")
              .select(`
                id,
                discount_percent,
                badge_type,
                products (id, name, base_price, image_url)
              `)
              .eq("is_active", true)
              .lte("start_date", now)
              .gte("end_date", now)
              .order("display_order", { ascending: true })
              .limit(settingsData.max_products || 6);

            if (dealsData) {
              const formattedDeals = dealsData
                .filter(d => d.products)
                .map(d => {
                  const basePrice = d.products.base_price || 0;
                  const discountedPrice = basePrice > 0 
                    ? basePrice * (1 - d.discount_percent / 100)
                    : 0;
                  
                  return {
                    id: d.products.id,
                    name: d.products.name,
                    image_url: d.products.image_url || "/placeholder.svg",
                    original_price: basePrice,
                    base_price: discountedPrice,
                    discount_percent: d.discount_percent,
                    offer_badge: d.badge_type,
                  };
                });
              setDeals(formattedDeals);
            }
          }
        } else {
          // If no settings exist, don't show the section by default
          setSettings({
            is_enabled: false,
            section_title: "Deals of the Day",
            section_subtitle: "Limited time offers - Don't miss out!",
            countdown_enabled: true,
            max_products: 6,
          });
        }
      } catch (error) {
        console.error("Error fetching deals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDealsAndSettings();
  }, []);

  // Don't render if disabled or no deals
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
        {/* Header */}
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
              <p className="text-orange-100 text-sm">{settings?.section_subtitle || "Limited time offers - Don't miss out!"}</p>
            </div>
          </div>

          {/* Countdown Timer */}
          {settings?.countdown_enabled && (
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-white" />
              <div className="flex gap-1.5">
                <div className="bg-white/25 backdrop-blur-md rounded-lg px-3 py-2 text-center min-w-[50px] shadow-lg">
                  <span className="text-xl font-bold text-white block">{String(timeLeft.hours).padStart(2, "0")}</span>
                  <p className="text-[9px] text-orange-100 uppercase tracking-wide">Hrs</p>
                </div>
                <span className="text-white/60 text-xl font-bold self-center">:</span>
                <div className="bg-white/25 backdrop-blur-md rounded-lg px-3 py-2 text-center min-w-[50px] shadow-lg">
                  <span className="text-xl font-bold text-white block">{String(timeLeft.minutes).padStart(2, "0")}</span>
                  <p className="text-[9px] text-orange-100 uppercase tracking-wide">Min</p>
                </div>
                <span className="text-white/60 text-xl font-bold self-center">:</span>
                <div className="bg-white/25 backdrop-blur-md rounded-lg px-3 py-2 text-center min-w-[50px] shadow-lg">
                  <span className="text-xl font-bold text-white block">{String(timeLeft.seconds).padStart(2, "0")}</span>
                  <p className="text-[9px] text-orange-100 uppercase tracking-wide">Sec</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Products */}
        <div className="p-6 bg-gradient-to-b from-orange-50/30 to-white">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {deals.map((product) => {
              const userType = sessionStorage.getItem('userType')?.toLowerCase() || 'pharmacy'
              return (
                <div
                  key={product.id}
                  className="flex-shrink-0 w-52 bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer group border border-gray-100"
                  onClick={() => navigate(`/${userType}/product/${product.id}`)}
                >
                {/* Image */}
                <div className="relative h-40 overflow-hidden rounded-t-xl bg-gray-100">
                  <img
                    src={product.image_url || "https://placehold.co/400x300/e5e7eb/6b7280?text=No+Image"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.src = "https://placehold.co/400x300/e5e7eb/6b7280?text=No+Image";
                    }}
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Discount Badge */}
                  <Badge className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white border-0 text-sm font-bold shadow-lg">
                    -{product.discount_percent}%
                  </Badge>
                  
                  {/* Offer Badge */}
                  {product.offer_badge && (
                    <Badge className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-gray-900 border-0 text-[10px] font-bold shadow-lg">
                      {product.offer_badge}
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="p-3.5">
                  <h4 className="font-semibold text-sm text-gray-900 mb-2.5 group-hover:text-blue-600 transition-colors leading-tight h-[60px] flex items-start">
                    <span className="line-clamp-3">{product.name}</span>
                  </h4>
                  
                  {/* Price Section */}
                  <div className="mb-3">
                    {product.base_price > 0 ? (
                      <div className="space-y-0.5">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold text-emerald-600">
                            ${product.base_price.toFixed(2)}
                          </span>
                          {product.original_price > 0 && (
                            <span className="text-xs text-gray-400 line-through">
                              ${product.original_price.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {product.original_price > 0 && (
                          <p className="text-[10px] text-emerald-600 font-medium">
                            Save ${(product.original_price - product.base_price).toFixed(2)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block">
                        View Sizes & Prices
                      </span>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-9 text-xs shadow-md hover:shadow-lg transition-all duration-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      const userType = sessionStorage.getItem('userType')?.toLowerCase() || 'pharmacy'
                      navigate(`/${userType}/product/${product.id}`);
                    }}
                  >
                    <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                    {product.base_price > 0 ? 'View Deal' : 'View Product'}
                  </Button>
                </div>
              </div>
            )})}
          </div>

          {/* View All */}
          <div className="text-center mt-6">
            <Button
              variant="outline"
              className="border-2 border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400 font-semibold shadow-sm hover:shadow-md transition-all duration-300"
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

export default DealsSection;
