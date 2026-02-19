import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, ShoppingCart, Trash2, Share2, 
  AlertCircle, Check, Package
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useWishlist } from "@/hooks/use-wishlist";

const Wishlist = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { wishlistItems, loading, removeFromWishlist } = useWishlist();

  const getImageUrl = (image?: string) => {
    const basePath = "https://qiaetxkxweghuoxyhvml.supabase.co/storage/v1/object/public/product-images/"
    if (image) {
      if (image.startsWith("http")) return image
      return basePath + image
    }
    return "/placeholder.svg"
  }

  const handleRemoveFromWishlist = async (productId: string, sizeId?: string) => {
    await removeFromWishlist(productId, sizeId);
  };

  // Navigate to product page with size selected
  const handleViewProduct = (item: any) => {
    const productId = item.product?.id || item.product_id;
    if (item.size_id) {
      // Navigate to size detail page directly
      navigate(`/pharmacy/product/${productId}/${item.size_id}`);
    } else {
      navigate(`/pharmacy/product/${productId}`);
    }
  };

  const addAllToCart = () => {
    const inStockItems = wishlistItems.filter(item => {
      if (item.size_id && item.product?.sizes) {
        const size = item.product.sizes.find((s: any) => s.id === item.size_id);
        return size && size.stock > 0;
      }
      return item.product && (item.product.current_stock > 0 || item.product.stock > 0);
    });
    
    if (inStockItems.length === 0) {
      toast({
        title: "No Items Available",
        description: "No in-stock items found in your wishlist",
        variant: "default"
      });
      return;
    }

    toast({
      title: "View Products",
      description: `Please add items to cart from product pages`,
    });
    
    // Navigate to the first product with size
    if (inStockItems[0].product) {
      handleViewProduct(inStockItems[0]);
    }
  };

  // Get size details from product
  const getSizeDetails = (item: any) => {
    if (!item.size_id || !item.product?.sizes) return null;
    return item.product.sizes.find((s: any) => s.id === item.size_id);
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
              {wishlistItems.length} sizes saved for later
            </p>
          </div>
          {wishlistItems.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Share2 className="w-4 h-4" />
                Share List
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2" onClick={addAllToCart}>
                <ShoppingCart className="w-4 h-4" />
                Add All to Cart
              </Button>
            </div>
          )}
        </div>

        {/* Wishlist Items */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="aspect-square bg-gray-200 animate-pulse"></div>
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : wishlistItems.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">Your wishlist is empty</h3>
              <p className="text-gray-500 mt-2 max-w-md mx-auto">
                Save sizes you love by clicking the heart icon on any product size. They'll appear here for easy access later.
              </p>
              <Button 
                className="mt-6 bg-blue-600 hover:bg-blue-700"
                onClick={() => navigate("/pharmacy/products")}
              >
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {wishlistItems.map((item) => {
              const product = item.product;
              const sizeDetails = getSizeDetails(item);
              
              // Use size-specific data if available
              const displayPrice = sizeDetails?.price || product?.base_price || 0;
              const displayStock = sizeDetails?.stock ?? product?.current_stock ?? product?.stock ?? 0;
              const isInStock = displayStock > 0;
              const displayImage = sizeDetails?.image || sizeDetails?.images?.[0] || product?.image_url || product?.images?.[0] || '';
              const productName = product?.name || 'Unknown Product';
              const productCategory = product?.category || 'Unknown';
              const sizeValue = sizeDetails?.size_value || '';
              const sizeUnit = sizeDetails?.size_unit || '';

              return (
                <Card 
                  key={item.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleViewProduct(item)}
                >
                  <div className="relative">
                    {/* Product Image */}
                    <div className="aspect-square bg-gray-100 p-4 lg:p-6">
                      <img
                        src={getImageUrl(displayImage)}
                        alt={productName}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                      />
                    </div>
                    
                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFromWishlist(item.product_id, item.size_id);
                      }}
                      className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
                    >
                      <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                    </button>

                    {/* Size Badge - Show actual size value */}
                    {sizeDetails && (
                      <Badge className="absolute top-2 left-2 bg-blue-600 text-white font-semibold">
                        <Package className="w-3 h-3 mr-1" />
                        {sizeValue} {sizeUnit}
                      </Badge>
                    )}

                    {/* Out of Stock Overlay */}
                    {!isInStock && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge variant="secondary" className="text-sm">
                          Out of Stock
                        </Badge>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 lg:p-2 flex flex-col">
                    <Badge variant="outline" className="mb-2 text-xs w-fit">
                      {productCategory}
                    </Badge>
                    <h3 className="font-semibold text-gray-900 line-clamp-2 min-h-[40px] text-sm lg:text-base">
                      {productName}
                    </h3>
                    
                    {/* Size Info */}
                    {sizeDetails && (
                      <div className="text-xs lg:text-sm text-gray-600 mt-1">
                        Size: <span className="font-medium text-blue-600">{sizeValue} {sizeUnit}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-base lg:text-lg font-bold text-blue-600">
                        ${displayPrice.toFixed(2)}
                      </span>
                      {sizeDetails && product?.base_price && sizeDetails.price !== product.base_price && (
                        <span className="text-xs lg:text-sm text-gray-400 line-through">
                          ${product.base_price.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Stock Status with quantity */}
                    <div className={`flex items-center gap-1 mt-2 text-xs lg:text-sm ${isInStock ? "text-green-600" : "text-red-500"}`}>
                      {isInStock ? (
                        <>
                          <Check className="w-3 h-3 lg:w-3 lg:h-3 flex-shrink-0" />
                          {/* <span className="truncate">In Stock ({displayStock} available)</span> */}
                          <span className="truncate">In Stock</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3 h-3 lg:w-4 lg:h-4 flex-shrink-0" />
                          Out of Stock
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 mt-3 lg:mt-4">
                      <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs lg:text-sm h-9 lg:h-10"
                        disabled={!isInStock}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewProduct(item);
                        }}
                      >
                        <ShoppingCart className="w-3 h-3 lg:w-4 lg:h-4 mr-1 flex-shrink-0" />
                        <span className="truncate">View Product</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 lg:h-1 lg:w-1 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromWishlist(item.product_id, item.size_id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500 lg:h-1 lg:w-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Wishlist;
