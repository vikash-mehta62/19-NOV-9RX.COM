import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, ShoppingCart, Trash2, Share2, 
  AlertCircle, Check
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";

interface WishlistItem {
  id: string;
  product_id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  category: string;
}

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const userProfile = useSelector((state: RootState) => state.user.profile);
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    // Mock wishlist data - replace with actual API
    const mockWishlist: WishlistItem[] = [
      {
        id: "1",
        product_id: "prod-1",
        name: "RX Vials 20 Dram - Amber",
        image: "/placeholder.svg",
        price: 45.99,
        originalPrice: 52.99,
        inStock: true,
        category: "RX Vials"
      },
      {
        id: "2",
        product_id: "prod-2",
        name: "Prescription Labels 500ct",
        image: "/placeholder.svg",
        price: 28.50,
        inStock: true,
        category: "RX Labels"
      },
      {
        id: "3",
        product_id: "prod-3",
        name: "Oral Syringes 10ml - 100pk",
        image: "/placeholder.svg",
        price: 35.00,
        inStock: false,
        category: "Oral Syringes"
      },
      {
        id: "4",
        product_id: "prod-4",
        name: "Paper Bags Medium - 1000ct",
        image: "/placeholder.svg",
        price: 89.99,
        originalPrice: 99.99,
        inStock: true,
        category: "RX Paper Bags"
      },
    ];

    setTimeout(() => {
      setWishlistItems(mockWishlist);
      setLoading(false);
    }, 500);
  }, [userProfile]);

  const removeFromWishlist = (id: string) => {
    setWishlistItems(prev => prev.filter(item => item.id !== id));
    toast({
      title: "Removed from Wishlist",
      description: "Item has been removed from your wishlist",
    });
  };

  const handleAddToCart = (item: WishlistItem) => {
    navigate(`/pharmacy/product/${item.product_id}`);
  };

  const addAllToCart = () => {
    const inStockItems = wishlistItems.filter(item => item.inStock);
    inStockItems.forEach(item => {
      // Navigate to product page for proper cart addition
      navigate(`/pharmacy/product/${item.product_id}`);
    });
    toast({
      title: "View Products",
      description: `Please add items to cart from product pages`,
    });
  };
  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Heart className="w-6 h-6 text-red-500 fill-red-500" />
              My Wishlist
            </h1>
            <p className="text-gray-500 mt-1">
              {wishlistItems.length} items saved for later
            </p>
          </div>
          {wishlistItems.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Share2 className="w-4 h-4" />
                Share List
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2" onClick={addAllToCart}>
                <ShoppingCart className="w-4 h-4" />
                Add All to Cart
              </Button>
            </div>
          )}
        </div>

        {/* Wishlist Items */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-200 rounded-full mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
              </div>
            </CardContent>
          </Card>
        ) : wishlistItems.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">Your wishlist is empty</h3>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Save items you love by clicking the heart icon on any product. They'll appear here for easy access later.
              </p>
              <Button 
                className="mt-6 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => navigate("/pharmacy/products")}
              >
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {wishlistItems.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 p-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                    />
                  </div>
                  
                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromWishlist(item.id)}
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
                  >
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  </button>

                  {/* Discount Badge */}
                  {item.originalPrice && (
                    <Badge className="absolute top-2 left-2 bg-red-500">
                      {Math.round((1 - item.price / item.originalPrice) * 100)}% OFF
                    </Badge>
                  )}

                  {/* Out of Stock Overlay */}
                  {!item.inStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="secondary" className="text-sm">
                        Out of Stock
                      </Badge>
                    </div>
                  )}
                </div>

                <CardContent className="p-4">
                  <Badge variant="outline" className="mb-2 text-xs">
                    {item.category}
                  </Badge>
                  <h3 className="font-semibold text-gray-900 line-clamp-2 min-h-[48px]">
                    {item.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-lg font-bold text-emerald-600">
                      ${item.price.toFixed(2)}
                    </span>
                    {item.originalPrice && (
                      <span className="text-sm text-gray-400 line-through">
                        ${item.originalPrice.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Stock Status */}
                  <div className={`flex items-center gap-1 mt-2 text-sm ${item.inStock ? "text-green-600" : "text-red-500"}`}>
                    {item.inStock ? (
                      <>
                        <Check className="w-4 h-4" />
                        In Stock
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        Out of Stock
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      disabled={!item.inStock}
                      onClick={() => handleAddToCart(item)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Add to Cart
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeFromWishlist(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Wishlist;
