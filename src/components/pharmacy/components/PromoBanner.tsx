"use client";

import { useState, useEffect } from "react";
import { X, Gift, Truck, Percent, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PromoMessage {
  id: string;
  icon: "gift" | "truck" | "percent" | "clock";
  text: string;
  link?: string;
  bgColor: string;
}

const iconMap = { gift: Gift, truck: Truck, percent: Percent, clock: Clock };

// Helper function to determine icon based on announcement type
const getIconFromType = (type: string | null): "gift" | "truck" | "percent" | "clock" => {
  if (!type) return "gift";
  const lowerType = type.toLowerCase();
  if (lowerType.includes("shipping") || lowerType.includes("delivery")) return "truck";
  if (lowerType.includes("discount") || lowerType.includes("sale") || lowerType.includes("percent")) return "percent";
  if (lowerType.includes("time") || lowerType.includes("limited")) return "clock";
  return "gift";
};

export const PromoBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [promos, setPromos] = useState<PromoMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch promo banners from database
  useEffect(() => {
    const fetchPromos = async () => {
      try {
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .eq("is_active", true)
          .eq("display_type", "banner")
          .or(`target_audience.eq.pharmacy,target_audience.eq.all`)
          .lte("start_date", now)
          .gte("end_date", now)
          .order("priority", { ascending: false });

        if (error) {
          console.error("Error fetching promo banners:", error);
          setPromos([]);
        } else if (data && data.length > 0) {
          const formattedPromos: PromoMessage[] = data.map((announcement) => ({
            id: announcement.id,
            icon: getIconFromType(announcement.announcement_type),
            text: announcement.message,
            link: announcement.link_url || undefined,
            bgColor: "from-violet-600 to-purple-600",
          }));
          setPromos(formattedPromos);
        } else {
          setPromos([]);
        }
      } catch (error) {
        console.error("Error fetching promo banners:", error);
        setPromos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPromos();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % promos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [promos.length]);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("promoBannerDismissed");
    if (dismissed) setIsVisible(false);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("promoBannerDismissed", "true");
  };

  if (!isVisible || promos.length === 0 || loading) return null;

  const currentPromo = promos[currentIndex];
  const IconComponent = iconMap[currentPromo.icon];

  return (
    <div className={`bg-gradient-to-r ${currentPromo.bgColor} text-white py-2 px-4 relative`}>
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3">
        <IconComponent className="h-4 w-4 flex-shrink-0" />
        <p className="text-sm font-medium text-center">{currentPromo.text}</p>
        <div className="flex gap-1 ml-3">
          {promos.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${index === currentIndex ? "bg-white w-3" : "bg-white/50"}`}
            />
          ))}
        </div>
        <button onClick={handleDismiss} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PromoBanner;
