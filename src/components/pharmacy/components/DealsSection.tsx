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
          .single();

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
                .map(d => ({
                  id: d.products.id,
                  name: d.products.name,
                  image_url: d.products.image_url || "/placeholder.svg",
                  original_price: d.products.base_price,
                  base_price: d.products.base_price * (1 - d.discount_percent / 100),
                  discount_percent: d.discount_percent,
                  offer_badge: d.badge_type,
                }));
              setDeals(formattedDeals);
            }
          }
        } else {
          // Fallback: If no settings table exists, use simulated deals
          const { data: products } = await supabase
            .from("products")
            .select("id, name, image_url, base_price")
            .limit(6);

          if (products && products.length > 0) {
            const dealsWithDiscount = products.map((p, index) => {
              const discountPercent = [10, 15, 20, 25, 30][index % 5];
              return {
                id: p.id,
                name: p.name,
                image_url: p.image_url || "/placeholder.svg",
                original_price: p.base_price,
                base_price: p.base_price * (1 - discountPercent / 100),
                discount_percent: discountPercent,
                offer_badge: index % 3 === 0 ? "HOT DEAL" : index % 3 === 1 ? "BEST SELLER" : "LIMITED",
              };
            });
            setDeals(dealsWithDiscount);
            setSettings({
              is_enabled: true,
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
    <Card className="border-0 shadow-lg bg-gradient-to-r from-orange-50 to-red-50 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Flame className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
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
              <div className="flex gap-1">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-center min-w-[50px]">
                  <span className="text-xl font-bold text-white">{String(timeLeft.hours).padStart(2, "0")}</span>
                  <p className="text-[10px] text-orange-100">HRS</p>
                </div>
                <span className="text-white text-xl font-bold self-center">:</span>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-center min-w-[50px]">
                  <span className="text-xl font-bold text-white">{String(timeLeft.minutes).padStart(2, "0")}</span>
                  <p className="text-[10px] text-orange-100">MIN</p>
                </div>
                <span className="text-white text-xl font-bold self-center">:</span>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 text-center min-w-[50px]">
                  <span className="text-xl font-bold text-white">{String(timeLeft.seconds).padStart(2, "0")}</span>
                  <p className="text-[10px] text-orange-100">SEC</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Products */}
        <div className="p-6">
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {deals.map((product) => (
              <div
                key={product.id}
                className="flex-shrink-0 w-48 bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate(`/pharmacy/product/${product.id}`)}
              >
                {/* Image */}
                <div className="relative h-32 overflow-hidden rounded-t-xl">
                  <img
                    src={product.image_url || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {/* Discount Badge */}
                  <Badge className="absolute top-2 left-2 bg-red-500 text-white border-0">
                    -{product.discount_percent}%
                  </Badge>
                  {/* Offer Badge */}
                  {product.offer_badge && (
                    <Badge className="absolute top-2 right-2 bg-yellow-500 text-yellow-900 border-0 text-[10px]">
                      {product.offer_badge}
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="p-3">
                  <h4 className="font-medium text-sm text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                    {product.name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-emerald-600">
                      ${product.base_price.toFixed(2)}
                    </span>
                    {product.original_price && (
                      <span className="text-sm text-gray-400 line-through">
                        ${product.original_price.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/pharmacy/product/${product.id}`);
                    }}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    View Deal
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* View All */}
          <div className="text-center mt-4">
            <Button
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
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
