"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Clock, ChevronRight, Eye, ShoppingCart } from "lucide-react";

interface RecentProduct {
  id: string;
  name: string;
  image_url: string;
  base_price: number;
  viewedAt: number;
}

export const RecentlyViewed = () => {
  const navigate = useNavigate();
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);

  useEffect(() => {
    // Get recently viewed from localStorage
    const stored = localStorage.getItem("recentlyViewed");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Sort by most recent and take top 6
        const sorted = parsed
          .sort((a: RecentProduct, b: RecentProduct) => b.viewedAt - a.viewedAt)
          .slice(0, 6);
        setRecentProducts(sorted);
      } catch (e) {
        console.error("Error parsing recently viewed:", e);
      }
    }
  }, []);

  // Helper to add product to recently viewed
  const addToRecentlyViewed = (product: Omit<RecentProduct, "viewedAt">) => {
    const stored = localStorage.getItem("recentlyViewed");
    let recent: RecentProduct[] = stored ? JSON.parse(stored) : [];
    
    // Remove if already exists
    recent = recent.filter((p) => p.id !== product.id);
    
    // Add to beginning
    recent.unshift({ ...product, viewedAt: Date.now() });
    
    // Keep only last 20
    recent = recent.slice(0, 20);
    
    localStorage.setItem("recentlyViewed", JSON.stringify(recent));
  };

  if (recentProducts.length === 0) return null;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Recently Viewed
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-600 hover:text-emerald-700"
            onClick={() => navigate("/pharmacy/history")}
          >
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {recentProducts.map((product) => (
            <div
              key={product.id}
              className="flex-shrink-0 w-36 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
              onClick={() => navigate(`/pharmacy/product/${product.id}`)}
            >
              {/* Image */}
              <div className="relative h-28 overflow-hidden rounded-t-xl">
                <img
                  src={product.image_url || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <Badge className="absolute top-2 right-2 bg-blue-500/80 text-white border-0 text-[10px]">
                  <Eye className="h-3 w-3 mr-1" />
                  Viewed
                </Badge>
              </div>

              {/* Content */}
              <div className="p-2">
                <h4 className="font-medium text-xs text-gray-900 line-clamp-2 mb-1 group-hover:text-emerald-600 transition-colors">
                  {product.name}
                </h4>
                <p className="text-sm font-bold text-emerald-600">
                  ${product.base_price.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Export helper function for other components to use
export const addToRecentlyViewed = (product: { id: string; name: string; image_url: string; base_price: number }) => {
  const stored = localStorage.getItem("recentlyViewed");
  let recent: RecentProduct[] = stored ? JSON.parse(stored) : [];
  
  recent = recent.filter((p) => p.id !== product.id);
  recent.unshift({ ...product, viewedAt: Date.now() });
  recent = recent.slice(0, 20);
  
  localStorage.setItem("recentlyViewed", JSON.stringify(recent));
};

export default RecentlyViewed;
