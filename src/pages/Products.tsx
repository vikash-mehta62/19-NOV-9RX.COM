import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Truck, Check, Heart, ShoppingCart, Tag, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Input } from "@/components/ui/input";

const Products = () => {
  const navigate = useNavigate();
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);

  const products = [
    {
      id: 1,
      name: "RX Vials 13 Dram - Child-Resistant Prescription Vials with Perfect Clarity",
      description: "Child-resistant prescription vials with perfect clarity",
      image: "/placeholder.svg",
      category: "RX VIALS",
      rating: 4.7,
      reviews: 2847,
      pricing: {
        base: 49.99,
        sale: 39.99,
      },
      discount: 20,
      inStock: true,
      freeDelivery: true,
    },
    {
      id: 2,
      name: "RX Labels 2x3 - High-Quality Prescription Labels with Strong Adhesive",
      description: "High-quality prescription labels with strong adhesive",
      image: "/placeholder.svg",
      category: "RX LABELS",
      rating: 4.5,
      reviews: 1523,
      pricing: {
        base: 29.99,
        sale: 23.99,
      },
      discount: 20,
      inStock: true,
      freeDelivery: true,
    },
    {
      id: 3,
      name: "Liquid Ovals 4oz - Premium Quality Amber Bottles for Liquid Medications",
      description: "Premium quality amber bottles for liquid medications",
      image: "/placeholder.svg",
      category: "LIQUID OVALS",
      rating: 4.8,
      reviews: 892,
      pricing: {
        base: 34.99,
        sale: 29.99,
      },
      discount: 14,
      inStock: true,
      freeDelivery: true,
    },
    {
      id: 4,
      name: "Ointment Jars 2oz - White Plastic Jars with Secure Lids",
      description: "White plastic jars with secure lids for ointments",
      image: "/placeholder.svg",
      category: "OINTMENT JARS",
      rating: 4.6,
      reviews: 634,
      pricing: {
        base: 24.99,
        sale: 19.99,
      },
      discount: 20,
      inStock: true,
      freeDelivery: true,
    },
    {
      id: 5,
      name: "RX Paper Bags - Kraft Paper Prescription Bags with Print Area",
      description: "Kraft paper prescription bags with print area",
      image: "/placeholder.svg",
      category: "RX PAPER BAGS",
      rating: 4.4,
      reviews: 1205,
      pricing: {
        base: 19.99,
        sale: 15.99,
      },
      discount: 20,
      inStock: true,
      freeDelivery: true,
    },
    {
      id: 6,
      name: "Oral Syringes 10ml - Accurate Dosing Syringes for Liquid Medications",
      description: "Accurate dosing syringes for liquid medications",
      image: "/placeholder.svg",
      category: "ORAL SYRINGES",
      rating: 4.9,
      reviews: 3421,
      pricing: {
        base: 14.99,
        sale: 11.99,
      },
      discount: 20,
      inStock: true,
      freeDelivery: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Amazon-style Header */}
      <div className="bg-[#232f3e] py-3 px-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex">
              <div className="relative flex-1 max-w-3xl mx-auto">
                <Input
                  placeholder="Search pharmacy supplies..."
                  className="rounded-l-lg rounded-r-none h-10 pr-12 border-0"
                />
                <Button 
                  size="sm" 
                  className="absolute right-0 top-0 h-10 rounded-l-none rounded-r-lg bg-orange-400 hover:bg-orange-500 px-4"
                >
                  <Search className="w-5 h-5 text-gray-900" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#232f3e] to-[#37475a] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Premium Pharmacy Supplies
          </h1>
          <p className="text-xl text-gray-300 mb-6 max-w-2xl mx-auto">
            High-quality products with competitive pricing for your pharmacy business
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Badge className="bg-orange-500 text-white px-4 py-2 text-sm">
              🔥 Up to 20% OFF
            </Badge>
            <Badge className="bg-emerald-500 text-white px-4 py-2 text-sm">
              <Truck className="w-4 h-4 mr-1 inline" />
              FREE Delivery
            </Badge>
            <Badge className="bg-blue-500 text-white px-4 py-2 text-sm">
              ⭐ Bulk Discounts
            </Badge>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
          <Button 
            variant="link" 
            className="text-blue-600 hover:text-orange-600"
            onClick={() => navigate("/login?tab=signup")}
          >
            View all products →
          </Button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card
              key={product.id}
              className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-orange-300"
              onMouseEnter={() => setHoveredProduct(product.id)}
              onMouseLeave={() => setHoveredProduct(null)}
            >
              {/* Wishlist Button */}
              <button className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/90 hover:bg-white shadow-sm transition-all">
                <Heart className="w-5 h-5 text-gray-400 hover:text-red-500 transition-colors" />
              </button>

              {/* Discount Badge */}
              {product.discount > 0 && (
                <div className="absolute top-3 left-3 z-20">
                  <Badge className="bg-red-600 text-white font-bold px-2 py-1">
                    -{product.discount}%
                  </Badge>
                </div>
              )}

              {/* Product Image */}
              <div className="relative aspect-square bg-gray-50 overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Product Info */}
              <div className="p-4 space-y-3">
                {/* Category Badge */}
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  {product.category}
                </Badge>

                {/* Product Name */}
                <h3 className="font-medium text-gray-900 line-clamp-2 min-h-[48px] hover:text-orange-600 cursor-pointer transition-colors text-sm">
                  {product.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= Math.floor(product.rating) ? 'fill-orange-400 text-orange-400' : 'fill-gray-200 text-gray-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-blue-600 hover:text-orange-600 cursor-pointer">
                    {product.reviews.toLocaleString()}
                  </span>
                </div>

                {/* Price Section */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">
                      ${product.pricing.sale}
                    </span>
                    <span className="text-sm text-gray-500 line-through">
                      ${product.pricing.base}
                    </span>
                  </div>
                </div>

                {/* Free Delivery Badge */}
                {product.freeDelivery && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Truck className="w-4 h-4" />
                      <span className="font-medium">FREE Delivery</span>
                    </div>
                  </div>
                )}

                {/* Stock Status */}
                {product.inStock && (
                  <div className="flex items-center gap-1 text-sm">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600">In Stock</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 space-y-2">
                  <Button 
                    className="w-full bg-gradient-to-b from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-gray-900 font-medium border border-yellow-600 shadow-sm"
                    onClick={() => navigate("/login?tab=signup")}
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full border-gray-300 hover:bg-gray-50"
                    onClick={() => navigate("/login?tab=signup")}
                  >
                    <Tag className="w-4 h-4 mr-2" />
                    Sign Up for Pricing
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="mt-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Save on Pharmacy Supplies?</h2>
          <p className="text-lg mb-6 opacity-90">
            Sign up today and get access to exclusive bulk pricing and discounts
          </p>
          <Button 
            size="lg"
            className="bg-white text-orange-600 hover:bg-gray-100 font-bold px-8"
            onClick={() => navigate("/login?tab=signup")}
          >
            Create Free Account
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Products;
