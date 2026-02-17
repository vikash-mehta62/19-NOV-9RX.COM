import { Package, ArrowRight, Star, ShoppingCart, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import category1 from "../../assests/home/image6.jpg";
import category2 from "../../assests/home/image1.jpg";
import category3 from "../../assests/home/image2.jpg";
import category6 from "../../assests/home/image5.jpg";

const FeaturedProducts = () => {
  const navigate = useNavigate();
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);

  const products = [
    {
      id: 1,
      name: "COMPLIANCE PACKAGING",
      image: category1,
      price: "From $62.99",
      rating: 4.9,
      reviews: 128,
      badge: "Best Seller",
      color: "from-amber-500 to-orange-500"
    },
    {
      id: 2,
      name: "CONTAINERS & CLOSURES",
      image: category3,
      price: "From $27.33",
      rating: 4.8,
      reviews: 95,
      badge: "Popular",
      color: "from-blue-500 to-indigo-500"
    },
    {
      id: 3,
      name: "RX PAPER BAGS",
      image: category2,
      price: "From $59.25",
      rating: 4.7,
      reviews: 72,
      badge: "Popular",
      color: "from-purple-500 to-pink-500"
    },
    {
      id: 4,
      name: "ORAL SYRINGES & ACCESSORIES",
      image: category6,
      price: "From $12.99",
      rating: 4.9,
      reviews: 156,
      badge: "Customizable",
      color: "from-emerald-500 to-teal-500"
    }
  ];

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-white to-blue-50/30 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-blue-100/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-56 sm:w-80 h-56 sm:h-80 bg-indigo-100/30 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold text-xs sm:text-sm mb-3 sm:mb-4">
              <Package className="w-3 sm:w-4 h-3 sm:h-4" />
              Featured Products
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-2 sm:mb-3">
              Top Pharmacy Supplies
            </h2>
            <p className="text-slate-600 max-w-lg text-sm sm:text-base">
              Quality products trusted by 250+ pharmacies nationwide
            </p>
          </div>
          <button
            onClick={() => navigate("/products")}
            className="inline-flex items-center justify-center md:justify-start gap-2 text-blue-600 font-semibold hover:gap-3 transition-all group text-sm sm:text-base"
          >
            View All Products
            <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 max-w-6xl mx-auto">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="group bg-white rounded-xl sm:rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 border border-slate-100 cursor-pointer max-w-[280px] mx-auto w-full"
              onMouseEnter={() => setHoveredProduct(index)}
              onMouseLeave={() => setHoveredProduct(null)}
              onClick={() => navigate("/products")}
            >
              {/* Product Image Area */}
              <div className="aspect-square bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
                <img
                  src={product.image}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />

                {/* Badge */}
                <div className="absolute top-2 sm:top-3 left-2 sm:left-3">
                  <span className="bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-sm">
                    {product.badge}
                  </span>
                </div>

                {/* Hover Actions - Hidden on mobile */}
                {/* <div className={`absolute inset-0 bg-black/40 items-center justify-center gap-3 transition-opacity duration-300 hidden sm:flex ${hoveredProduct === index ? 'opacity-100' : 'opacity-0'}`}>
                    <button className="w-8 sm:w-10 h-8 sm:h-10 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                      <Eye className="w-4 sm:w-5 h-4 sm:h-5 text-slate-700" />
                    </button>
                    <button className="w-8 sm:w-10 h-8 sm:h-10 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                      <ShoppingCart className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                    </button>
                  </div> */}
              </div>

              {/* Product Info */}
              <div className="p-3 sm:p-4 lg:p-5">
                <h3 className="text-[11px] sm:text-xs lg:text-sm font-bold text-slate-900 mb-1 sm:mb-2 group-hover:text-blue-600 transition-colors">
                  {product.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3">
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <Star className="w-3 sm:w-4 h-3 sm:h-4 text-amber-400 fill-amber-400" />
                    <span className="text-xs sm:text-sm font-semibold text-slate-700">{product.rating}</span>
                  </div>
                  <span className="text-slate-400 text-[10px] sm:text-sm hidden sm:inline">({product.reviews})</span>
                </div>

                {/* Price */}
                <div className="flex items-center flex-row sm:flex-row gap-1">
                  <span className="text-sm sm:text-base lg:text-lg font-bold text-slate-900">{product.price}</span>
                  <span className="text-[10px] sm:text-xs text-slate-500 hidden sm:inline">/case</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 sm:mt-12 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl sm:rounded-2xl p-4 sm:p-4 sm:pr-6 text-white">
            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-white/20 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Package className="w-5 sm:w-6 h-5 sm:h-6" />
            </div>
            <div className="text-center sm:text-left">
              <p className="font-semibold text-sm sm:text-base">Browse 250+ Products</p>
              <p className="text-blue-200 text-xs sm:text-sm">Find everything your pharmacy needs</p>
            </div>
            <button
              onClick={() => navigate("/products")}
              className="bg-white text-blue-600 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold hover:bg-blue-50 transition-colors text-sm sm:text-base w-full sm:w-auto"
            >
              Shop Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
