"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/hooks/use-cart";
import { ShoppingCart, X, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const FloatingCartButton = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal } = useCart();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

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

  if (totalItems === 0) return null;

  return (
    <>
      {/* Floating Cart Button - Mobile Only */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-4 right-4 z-50 lg:hidden"
          >
            {/* Expanded View */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="absolute bottom-16 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mb-2"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white">
                      <ShoppingCart className="h-5 w-5" />
                      <span className="font-semibold">Your Cart</span>
                    </div>
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="text-white/80 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Cart Summary */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Items in cart</span>
                      <span className="font-semibold">{totalItems}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-lg font-bold text-emerald-600">
                        ${cartTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Preview Items */}
                    <div className="flex -space-x-2 py-2">
                      {cartItems.slice(0, 4).map((item, index) => (
                        <div
                          key={item.id || index}
                          className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 overflow-hidden"
                        >
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {cartItems.length > 4 && (
                        <div className="w-10 h-10 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-xs font-semibold text-emerald-700">
                          +{cartItems.length - 4}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => {
                          setIsExpanded(false);
                          navigate("/pharmacy/cart");
                        }}
                      >
                        View Cart
                      </Button>
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => {
                          setIsExpanded(false);
                          navigate("/pharmacy/order/create");
                        }}
                      >
                        Checkout
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Button */}
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-14 w-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30 relative"
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
