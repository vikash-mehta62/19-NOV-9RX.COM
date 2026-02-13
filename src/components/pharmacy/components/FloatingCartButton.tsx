"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart, X, ChevronUp, ArrowRight, Trash2, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export const FloatingCartButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { cartItems, cartTotal, removeFromCart } = useCart();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { toast } = useToast();

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Hide floating cart on order create page (cart is shown in OrderSummaryCard)
  const isOnOrderCreatePage = location.pathname.includes("/order/create");

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show scroll to top button after scrolling 500px
      setShowScrollTop(currentScrollY > 500);
      
      // Hide floating button when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRemoveItem = async (productId: string, productName: string) => {
    const success = await removeFromCart(productId);
    if (success) {
      toast({
        title: "Item Removed",
        description: `${productName} removed from cart`,
      });
    }
  };

  const handleViewDetails = (productId: string) => {
    const userType = sessionStorage.getItem('userType')?.toLowerCase() || 'pharmacy'
    setIsExpanded(false);
    navigate(`/${userType}/product/${productId}`);
  };

  // Don't show if no items or on order create page
  if (totalItems === 0 || isOnOrderCreatePage) return null;

  return (
    <>
      {/* Floating Cart Button - Mobile Only */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 right-4 z-40 lg:hidden"
          >
            {/* Expanded View */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mb-2"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <ShoppingCart className="h-5 w-5" />
                      <span className="font-semibold">Your Cart ({totalItems})</span>
                    </div>
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="text-white/80 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Cart Items */}
                  <div className="p-3 max-h-64 overflow-y-auto">
                    {cartItems.slice(0, 5).map((item, index) => (
                      <div
                        key={item.productId || index}
                        className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="w-12 h-12 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              onClick={() => handleViewDetails(item.productId)}
                              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => handleRemoveItem(item.productId, item.name)}
                              className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </button>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600">
                          ${item.price?.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {cartItems.length > 5 && (
                      <p className="text-xs text-gray-500 text-center py-2">
                        +{cartItems.length - 5} more items
                      </p>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="p-3 bg-gray-50 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="text-lg font-bold text-emerald-600">
                        ${cartTotal.toFixed(2)}
                      </span>
                    </div>
                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700 gap-2 min-h-[44px] rounded-xl"
                      onClick={() => {
                        setIsExpanded(false);
                        const userType = sessionStorage.getItem('userType')?.toLowerCase() || 'pharmacy';
                        // Different user types have different order creation paths
                        const orderPath = userType === 'pharmacy' ? `/${userType}/order/create` : `/${userType}/order`;
                        navigate(orderPath);
                      }}
                    >
                      Proceed to Checkout
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Button */}
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-14 w-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30 relative"
            >
              <ShoppingCart className="h-6 w-6 text-white" />
              <Badge className="absolute -top-1 -right-1 h-6 w-6 p-0 flex items-center justify-center bg-red-500 text-white border-2 border-white text-xs">
                {totalItems > 99 ? "99+" : totalItems}
              </Badge>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={scrollToTop}
            className="fixed bottom-4 left-4 z-50 h-12 w-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronUp className="h-5 w-5 text-gray-600" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingCartButton;
