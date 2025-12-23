import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchBanners();
  }, [bannerType]);

  useEffect(() => {
    if (!autoPlay || banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, banners.length]);

  const fetchBanners = async () => {
    try {
      console.log("BannerSlider: Fetching banners with type:", bannerType);
      
      // Fetch all active banners first (don't filter by type initially)
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      console.log("BannerSlider: Raw data:", data, "Error:", error);

      if (error) throw error;

      // Filter by banner type on client side (more reliable)
      let filteredData = data || [];
      if (bannerType !== "all" && filteredData.length > 0) {
        // Only filter if banner_type column exists and has value
        filteredData = filteredData.filter(b => 
          !b.banner_type || b.banner_type === bannerType
        );
      }

      // Filter by date range on client side
      const activeBanners = filteredData.filter((banner) => {
        const now = new Date();
        if (banner.start_date && new Date(banner.start_date) > now) return false;
        if (banner.end_date && new Date(banner.end_date) < now) return false;
        return true;
      });

      console.log("BannerSlider: Active banners after filtering:", activeBanners.length);
      setBanners(activeBanners);

      // Track view for first banner
      if (activeBanners.length > 0) {
        trackBannerView(activeBanners[0].id);
      }
    } catch (error) {
      console.error("BannerSlider: Error fetching banners:", error);
    } finally {
      setLoading(false);
    }
  };

  const trackBannerView = async (bannerId: string) => {
    try {
      // Try RPC first, fallback to direct update
      const { error } = await supabase.rpc("increment_banner_view", { p_banner_id: bannerId });
      if (error) {
        // Fallback: direct update (may fail due to RLS, but that's ok)
        await supabase.from("banners").update({ view_count: supabase.rpc("view_count") }).eq("id", bannerId);
      }
    } catch (error) {
      // Silently fail - view tracking is not critical
    }
  };

  const trackBannerClick = async (bannerId: string) => {
    try {
      const { error } = await supabase.rpc("increment_banner_click", { p_banner_id: bannerId });
      if (error) {
        // Silently fail if RPC doesn't exist
      }
    } catch (error) {
      // Silently fail
    }
  };

  const handleBannerClick = (banner: Banner) => {
    trackBannerClick(banner.id);
    if (banner.link_url) {
      if (banner.link_url.startsWith("http")) {
        window.open(banner.link_url, "_blank");
      } else {
        navigate(banner.link_url);
      }
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    if (banners[index]) {
      trackBannerView(banners[index].id);
    }
  };

  if (loading) {
    return (
      <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse ${className}`}>
        <div className="h-64 md:h-96"></div>
      </div>
    );
  }

  if (banners.length === 0) {
    // Show a default promotional banner when no banners in database
    return (
      <div className={`relative rounded-2xl overflow-hidden shadow-xl ${className}`}>
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 h-64 md:h-80">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">
              Premium Pharmacy Supplies
            </h2>
            <p className="text-lg opacity-90 mb-4">
              Quality products at competitive prices
            </p>
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

  return (
    <div className={`relative rounded-2xl overflow-hidden shadow-xl ${className}`}>
      {/* Banner Image */}
      <div 
        className="relative cursor-pointer transition-all duration-500"
        onClick={() => handleBannerClick(currentBanner)}
      >
        <img
          src={imageUrl}
          alt={currentBanner.title}
          className="w-full h-64 md:h-96 object-cover"
          onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
        />
        
        {/* Overlay */}
        <div 
          className="absolute inset-0"
          style={{ 
            backgroundColor: `rgba(0,0,0,${currentBanner.overlay_opacity || 0.3})` 
          }}
        />

        {/* Content */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-6"
          style={{ color: currentBanner.text_color || "#FFFFFF" }}
        >
          <Badge className="bg-yellow-400 text-yellow-900 mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Special Offer
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-lg">
            {currentBanner.title}
          </h2>
          {currentBanner.subtitle && (
            <p className="text-lg md:text-xl opacity-90 mb-6 max-w-2xl drop-shadow">
              {currentBanner.subtitle}
            </p>
          )}
          {currentBanner.link_text && (
            <Button 
              size="lg"
              className="bg-white text-gray-900 hover:bg-gray-100 shadow-lg"
              onClick={(e) => {
                e.stopPropagation();
                handleBannerClick(currentBanner);
              }}
            >
              {currentBanner.link_text}
            </Button>
          )}
        </div>
      </div>

      {/* Navigation Arrows */}
      {showControls && banners.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
          >
            <ChevronLeft className="h-6 w-6 text-gray-800" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg transition-all"
          >
            <ChevronRight className="h-6 w-6 text-gray-800" />
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={(e) => { e.stopPropagation(); goToSlide(index); }}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentIndex 
                  ? "bg-white w-8" 
                  : "bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerSlider;
