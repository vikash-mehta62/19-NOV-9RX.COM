import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, Award, ShoppingBag } from "lucide-react";

export const HeroSection = () => {
  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl mb-8">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 grid md:grid-cols-2 gap-8 p-8 md:p-12">
        {/* Left side - Text content */}
        <div className="flex flex-col justify-center space-y-6 text-white">
          <div className="flex items-center gap-2">
            <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400 px-3 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              Limited Time Offer
            </Badge>
            <Badge className="bg-white/20 text-white hover:bg-white/30 px-3 py-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              Best Deals
            </Badge>
          </div>

          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3 leading-tight">
              Premium Medical
              <br />
              <span className="text-yellow-300">Supplies & Equipment</span>
            </h1>
            <p className="text-blue-50 text-lg leading-relaxed">
              Discover exclusive deals on high-quality pharmacy supplies. 
              Professional-grade products at competitive prices.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <ShoppingBag className="mr-2 h-5 w-5" />
              Browse Products
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 shadow-lg transition-all duration-300"
            >
              <Award className="mr-2 h-5 w-5" />
              View Offers
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-3xl font-bold">500+</p>
              <p className="text-blue-100 text-sm">Products</p>
            </div>
            <div>
              <p className="text-3xl font-bold">50+</p>
              <p className="text-blue-100 text-sm">Categories</p>
            </div>
            <div>
              <p className="text-3xl font-bold">24/7</p>
              <p className="text-blue-100 text-sm">Support</p>
            </div>
          </div>
        </div>

        {/* Right side - Image/Visual */}
        <div className="hidden md:flex items-center justify-center relative">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Decorative circles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 bg-white/10 rounded-full animate-pulse"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-80 h-80 bg-white/5 rounded-full animate-pulse delay-500"></div>
            </div>
            
            {/* Main image placeholder - you can replace with actual product image */}
            <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
              <img
                src="/lovable-uploads/320ef3c7-e13e-4702-b3ff-d861e32d31ea.png"
                alt="Medical Supplies"
                className="w-full h-64 object-contain drop-shadow-2xl"
              />
            </div>

            {/* Floating badges */}
            <div className="absolute top-10 right-10 bg-white rounded-2xl p-4 shadow-xl animate-bounce">
              <p className="text-blue-600 font-bold text-2xl">30%</p>
              <p className="text-gray-600 text-xs">OFF</p>
            </div>
            
            <div className="absolute bottom-10 left-10 bg-yellow-400 rounded-2xl p-4 shadow-xl animate-bounce delay-300">
              <p className="text-yellow-900 font-bold text-sm">Free</p>
              <p className="text-yellow-800 text-xs">Shipping</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
