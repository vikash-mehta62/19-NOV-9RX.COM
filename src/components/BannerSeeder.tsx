import { useEffect } from "react";
import { seedDefaultBanners } from "@/utils/seedDefaultBanners";

export const BannerSeeder = () => {
  useEffect(() => {
    const initializeBanners = async () => {
      try {
        // Only seed banners in production or when explicitly needed
        const shouldSeed = localStorage.getItem('banners_seeded') !== 'true';
        
        if (shouldSeed) {
          console.log("Initializing default banners...");
          const result = await seedDefaultBanners();
          
          if (result.success) {
            localStorage.setItem('banners_seeded', 'true');
            console.log("Default banners initialized successfully");
          } else {
            console.log("Banners already exist or initialization skipped");
          }
        }
      } catch (error) {
        console.error("Error initializing banners:", error);
      }
    };

    // Run after a short delay to ensure app is fully loaded
    const timer = setTimeout(initializeBanners, 2000);
    return () => clearTimeout(timer);
  }, []);

  // This component doesn't render anything
  return null;
};

export default BannerSeeder;