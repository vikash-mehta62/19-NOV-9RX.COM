
import { Package2, Syringe, ShoppingBag, Stethoscope, Lock, Eye, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/supabaseClient";
import { Product } from "@/types/product";

const ProductCategories = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data: productsData, error } = await supabase
          .from("products")
          .select("*, product_sizes(*)")
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching products:", error);
          return;
        }

        const mappedProducts: Product[] = productsData.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          base_price: item.base_price || 0,
          category: item.category || "",
          shipping_cost: item.shipping_cost || 0,
          images: item.images || [],
          image_url: item.image_url || item.image || "/placeholder.svg",
          sku: item.sku,
          key_features: item.key_features || "",
          squanence: item.squanence || "",
          created_at: item.created_at,
          updated_at: item.updated_at,
          current_stock: item.current_stock || 0,
          min_stock: item.min_stock || 0,
          reorder_point: item.reorder_point || 0,
          quantity_per_case: item.quantity_per_case || 0,
          customization: {
            allowed: item.customization?.allowed || false,
            options: item.customization?.options || [],
            price: item.customization?.price || 0,
          },
          sizes: item.product_sizes?.map((size) => ({
            id: size.id,
            product_id: size.product_id,
            size_value: size.size_value,
            size_unit: size.size_unit,
            sku: size.sku,
            price: size.price,
            price_per_case: size.price_per_case,
            stock: size.stock,
            quantity_per_case: size.quantity_per_case,
            image: size.image,
            created_at: size.created_at,
            updated_at: size.updated_at,
          })) || [],
        }));

        setProducts(mappedProducts);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-40 h-40 bg-emerald-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-semibold text-sm mb-6">
            <Package2 className="w-4 h-4 mr-2" />
            Premium Product Portfolio
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-emerald-700 to-blue-700 bg-clip-text text-transparent">
            Your Trusted Supply Partner
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Discover our comprehensive range of high-quality pharmacy supplies designed to help you deliver exceptional patient care.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-16">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-[400px] rounded-3xl bg-gray-100 animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-16">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onClick={() => navigate(`/product/${product.id}`)}
              />
            ))}
          </div>
        )}

        {/* Pricing Notice */}
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200 p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-emerald-100 rounded-full">
                <Lock className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              View Competitive Pricing
            </h3>
            <p className="text-gray-600 mb-6 text-lg">
              Access our exclusive wholesale pricing, volume discounts, and special offers by creating your free account.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/login", { state: { defaultTab: "signup" } })}
                className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Sign Up for Pricing
              </Button>
              <Button
                onClick={() => navigate("/login")}
                variant="outline"
                className="border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 font-semibold px-8 py-3 rounded-xl transition-all duration-300"
              >
                <Eye className="w-4 h-4 mr-2" />
                Login to View Prices
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};

const ProductCard = ({
  product,
  onClick,
}: {
  product: Product;
  onClick: () => void;
}) => {
  const [imageUrl, setImageUrl] = useState<string>("/placeholder.svg");
  const [isImageLoaded, setIsImageLoaded] = useState(false);

const loadImage = async () => {
  let imagePath = product.images?.[0] || product.image_url;

  if (!imagePath || imagePath === "/placeholder.svg") {
    setImageUrl("/placeholder.svg");
    return;
  }

  try {
    // If the image path is already a full URL
    if (imagePath.startsWith("http")) {
      setImageUrl(imagePath);
    } else {
      // Get public URL from Supabase
      const { data, error } = supabase.storage
        .from("product-images")
        .getPublicUrl(imagePath);

      if (error || !data?.publicUrl) {
        throw error;
      }

      setImageUrl(data.publicUrl);
    }
  } catch (error) {
    console.error("Error loading image:", error);
    setImageUrl("/placeholder.svg");
  }
};


  useEffect(() => {
    loadImage();
  }, [product.image_url]);

  const getCategoryBadgeColor = (category: string) => {
 
        return "bg-blue-100 text-blue-700";
  
  };

  return (
    <div className="group relative cursor-pointer " onClick={onClick}>
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-100/50 to-blue-100/50 rounded-3xl blur-xl transition-all duration-300 group-hover:blur-2xl opacity-0 group-hover:opacity-100"></div>

      <Card className="relative  bg-white rounded-3xl p-6 shadow-xl border-0 hover:shadow-2xl transition-all duration-500 transform hover:scale-105 overflow-hidden">
        {/* Category Badge */}
        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs z-50 font-semibold ${getCategoryBadgeColor(product.category)}`}>
          {product.category}
        </div>

        {/* Product Image with Loader */}
        <div className="relative  mb-6 h-40 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
          {!isImageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="w-6 h-6 border-2 border-t-transparent border-emerald-500 rounded-full animate-spin" />
            </div>
          )}
          <img
            src={imageUrl}
            alt={product.name}
            className={`h-full object-contain transition-opacity duration-300 ${
              isImageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setIsImageLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/placeholder.svg";
              setIsImageLoaded(true);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        {/* Product Info */}
        <div className="space-y-3 ">
         <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
  {product.name}
</h3>


      

          {/* Features */}
         

          {/* Size Info */}
          {product.sizes?.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Available Sizes</span>
                <span className="text-sm font-medium text-emerald-600">
                  {product.sizes.length} options
                </span>
              </div>
            </div>
          )}

          {/* Pricing Placeholder */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              {/* <span className="text-gray-400 font-medium">Pricing Available</span> */}
              <div className="flex items-center text-emerald-600">
                <Lock className="w-4 h-4 mr-1" />
                <span className="text-sm font-semibold">After Login</span>
              </div>
            </div>
          </div>

          {/* View Details Button */}
          <Button
            className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold py-2 rounded-xl transition-all duration-300"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            View Details
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ProductCategories;
