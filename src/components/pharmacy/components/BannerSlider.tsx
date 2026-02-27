import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Sparkles, Truck, Percent, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  mobile_image_url: string | null;
  link_url: string | null;
  link_text: string | null;
  display_order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  banner_type: string;
  text_color: string | null;
  overlay_opacity: number | null;
  background_color: string | null;
}

interface BannerSliderProps {
  bannerType?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  showControls?: boolean;
  showIndicators?: boolean;
  className?: string;
}

export const BannerSlider = ({
  bannerType = "hero",
  autoPlay = true,
  autoPlayInterval = 5000,
  showControls = true,
  showIndicators = true,
  className = "",
}: BannerSliderProps) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBanners();
  }, [bannerType]);

  useEffect(() => {
    if (!autoPlay || banners.length <= 1) return;

    const interval = setInterval(() => {
      goToNext();
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, banners.length, currentIndex]);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;

      let filteredData = data || [];
      
      // Filter by banner type
      if (bannerType !== "all" && filteredData.length > 0) {
        filteredData = filteredData.filter(b => 
          !b.banner_type || b.banner_type === bannerType
        );
      }

      // Filter by date range
      const now = new Date();
      filteredData = filteredData.filter((banner) => {
        if (banner.start_date && new Date(banner.start_date) > now) return false;
        if (banner.end_date && new Date(banner.end_date) < now) return false;
        return true;
      });

      setBanners(filteredData);
    } catch (error) {
      console.error("BannerSlider: Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerClick = (banner: Banner) => {
    if (banner.link_url) {
      if (banner.link_url.startsWith("http")) {
        window.open(banner.link_url, "_blank");
      } else {
        navigate(banner.link_url);
      }
    }
  };

  const goToPrevious = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [banners.length, isTransitioning]);

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % banners.length);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [banners.length, isTransitioning]);

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    if (banners[index]) {
      trackBannerView(banners[index].id);
    }
    setTimeout(() => setIsTransitioning(false), 500);
  };

  // Get badge icon based on banner content
  const getBadgeContent = (banner: Banner) => {
    const title = banner.title.toLowerCase();
    if (title.includes('delivery') || title.includes('shipping')) {
      return { icon: Truck, text: "Fast Delivery", color: "bg-cyan-600" };
    }
    if (title.includes('sale') || title.includes('off') || title.includes('discount')) {
      return { icon: Percent, text: "Special Offer", color: "bg-teal-500" };
    }
    if (title.includes('health') || title.includes('care') || title.includes('premium')) {
      return { icon: Shield, text: "Trusted Quality", color: "bg-teal-600" };
    }
    return { icon: Sparkles, text: "Featured", color: "bg-teal-600" };
  };

  if (loading) {
    return (
      <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 animate-pulse ${className}`}>
        <div className="h-[280px] md:h-[400px] lg:h-[450px]"></div>
      </div>
    );
  }

  if (banners.length === 0) {
    return (
      <div className={`relative rounded-2xl overflow-hidden shadow-2xl ${className}`}>
        <div className="relative h-[280px] md:h-[400px] lg:h-[450px] bg-gradient-to-br bg-blue-500">
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white">
            <Badge className="bg-white/20 text-white border-white/30 mb-4 backdrop-blur-sm">
              <Shield className="h-3 w-3 mr-1" />
              Trusted Pharmacy
            </Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-lg">
              Premium Healthcare Solutions
            </h2>
            <p className="text-lg md:text-xl opacity-90 mb-6 max-w-2xl">
              Quality pharmaceutical products at competitive prices
            </p>
            <Button 
              size="lg"
              className="bg-white text-blue-600 hover:bg-white/90 shadow-xl font-semibold px-8"
              onClick={() => navigate('/pharmacy/products')}
            >
              Shop Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentBanner = banners[currentIndex];
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const imageUrl = isMobile && currentBanner.mobile_image_url 
    ? currentBanner.mobile_image_url 
    : currentBanner.image_url;
  const badgeContent = getBadgeContent(currentBanner);
  const BadgeIcon = badgeContent.icon;

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-2xl group ${className}`}>
      {/* Banner Container */}
      <div className="relative h-[280px] md:h-[400px] lg:h-[450px]">
        {/* Background Image with Ken Burns Effect */}
        {banners.map((banner, index) => {
          const bannerImageUrl = isMobile && banner.mobile_image_url 
            ? banner.mobile_image_url 
            : banner.image_url;
          
          return (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                index === currentIndex 
                  ? 'opacity-100 scale-100' 
                  : 'opacity-0 scale-105'
              }`}
            >
              <img
                src={bannerImageUrl}
                alt={banner.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1920&h=600&fit=crop&auto=format";
                }}
              />
            </div>
          );
        })}
        
        {/* Gradient Overlay */}
        <div 
          className="absolute inset-0 transition-opacity duration-500"
          style={{ 
            background: `linear-gradient(135deg, 
              rgba(0,0,0,${(currentBanner.overlay_opacity || 0.5) + 0.1}) 0%, 
              rgba(0,0,0,${currentBanner.overlay_opacity || 0.5}) 50%,
              rgba(0,0,0,${(currentBanner.overlay_opacity || 0.5) - 0.1}) 100%)`
          }}
        />

        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        </div>

        {/* Content */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 md:p-12"
          style={{ color: currentBanner.text_color || "#FFFFFF" }}
        >
          {/* Badge */}
          <Badge 
            className={`${badgeContent.color} text-white border-0 mb-4 md:mb-6 px-4 py-1.5 text-sm font-medium shadow-lg animate-pulse`}
          >
            <BadgeIcon className="h-3.5 w-3.5 mr-1.5" />
            {badgeContent.text}
          </Badge>

          {/* Title with Animation */}
          <h2 
            className={`text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mb-3 md:mb-4 drop-shadow-2xl leading-tight transition-all duration-500 ${
              isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
            }`}
            style={{ textShadow: '2px 4px 8px rgba(0,0,0,0.4)' }}
          >
            {currentBanner.title}
          </h2>

          {/* Subtitle */}
          {currentBanner.subtitle && (
            <p 
              className={`text-sm sm:text-base md:text-xl lg:text-2xl opacity-95 mb-6 md:mb-8 max-w-3xl drop-shadow-lg transition-all duration-500 delay-100 ${
                isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
              }`}
              style={{ textShadow: '1px 2px 4px rgba(0,0,0,0.3)' }}
            >
              {currentBanner.subtitle}
            </p>
          )}

          {/* CTA Button */}
          {currentBanner.link_text && (
            <Button 
              size="lg"
              className={`bg-white text-gray-900 hover:bg-white/95 shadow-2xl font-semibold px-8 md:px-10 py-3 md:py-6 text-base md:text-lg rounded-full transition-all duration-300 hover:scale-105 hover:shadow-white/25 ${
                isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleBannerClick(currentBanner);
              }}
            >
              {currentBanner.link_text}
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation Arrows */}
        {showControls && banners.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
              className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 md:p-3 rounded-full shadow-xl transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 backdrop-blur-sm"
              aria-label="Previous banner"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 text-gray-800" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 md:p-3 rounded-full shadow-xl transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 backdrop-blur-sm"
              aria-label="Next banner"
            >
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6 text-gray-800" />
            </button>
          </>
        )}

        {/* Progress Indicators */}
        {showIndicators && banners.length > 1 && (
          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 md:gap-3">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.stopPropagation(); goToSlide(index); }}
                className={`h-2 md:h-2.5 rounded-full transition-all duration-500 shadow-lg ${
                  index === currentIndex 
                    ? "bg-white w-8 md:w-10" 
                    : "bg-white/50 hover:bg-white/70 w-2 md:w-2.5"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Auto-play Progress Bar */}
        {autoPlay && banners.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
            <div 
              className="h-full bg-white/60 transition-all ease-linear"
              style={{ 
                width: '100%',
                animation: `progress ${autoPlayInterval}ms linear infinite`
              }}
            />
          </div>
        )}
      </div>

      {/* CSS for progress animation */}
      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default BannerSlider;
