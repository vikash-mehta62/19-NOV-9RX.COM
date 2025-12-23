"use client";

import { useState, useEffect } from "react";
import { X, Gift, Truck, Percent, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PromoMessage {
  id: string;
  icon: "gift" | "truck" | "percent" | "clock";
  text: string;
  link?: string;
  bgColor: string;
}

const defaultPromos: PromoMessage[] = [
  { id: "1", icon: "truck", text: "Free shipping on orders over $100", bgColor: "from-violet-600 to-purple-600" },
  { id: "2", icon: "percent", text: "Use code SAVE10 for 10% off your first order", bgColor: "from-violet-600 to-purple-600" },
  { id: "3", icon: "gift", text: "Earn 2x reward points on all orders this week", bgColor: "from-violet-600 to-purple-600" },
];

const iconMap = { gift: Gift, truck: Truck, percent: Percent, clock: Clock };

export const PromoBanner = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [promos] = useState<PromoMessage[]>(defaultPromos);

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

  if (!isVisible || promos.length === 0) return null;

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
