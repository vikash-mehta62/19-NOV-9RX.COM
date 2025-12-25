import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  MapPin,
  Package,
  Edit2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import type { Customer, BillingAddress, ShippingAddress } from "../types";
import type { CartItem } from "@/store/types/cartTypes";
import { useCart } from "@/hooks/use-cart";

export interface ReviewOrderStepProps {
  customer?: Customer;
  billingAddress?: BillingAddress;
  shippingAddress?: ShippingAddress;
  cartItems: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  onEditCustomer: () => void;
  onEditAddress: () => void;
  onEditProducts: () => void;
}

export const ReviewOrderStep = ({
  customer,
  billingAddress,
  shippingAddress,
  cartItems: propCartItems,
  subtotal,
  tax,
  shipping,
  total,
  onEditCustomer,
  onEditAddress,
  onEditProducts,
}: ReviewOrderStepProps) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // Get fresh cart items from hook to ensure latest state
  const { cartItems: hookCartItems } = useCart();
  
  // Use hook cart items if prop cart items are empty
  const cartItems = propCartItems.length > 0 ? propCartItems : hookCartItems;

  const toggleItemExpanded = (productId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "Pharmacy":
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      case "Hospital":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Group":
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Review Order</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">
          Please review all order details before proceeding to payment
        </p>
      </div>

      <Separator />

      {/* Customer Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              <CardTitle>Customer Information</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onEditCustomer}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {customer ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Name</p>
                <p className="text-sm text-gray-900">{customer.name}</p>
              </div>
              {customer.company_name && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Company</p>
                  <p className="text-sm text-gray-900">{customer.company_name}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-sm text-gray-900">{customer.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Phone</p>
                <p className="text-sm text-gray-900">{customer.phone || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Type</p>
                <Badge className={getTypeBadgeColor(customer.type)}>
                  {customer.type}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No customer selected</p>
          )}
        </CardContent>
      </Card>

      {/* Address Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Billing Address Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <CardTitle>Billing Address</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={onEditAddress}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {billingAddress?.street ? (
              <div className="space-y-2 text-sm">
                {billingAddress.company_name && (
                  <p className="font-medium">{billingAddress.company_name}</p>
                )}
                {billingAddress.attention && (
                  <p className="text-gray-600">Attn: {billingAddress.attention}</p>
                )}
                <p>{billingAddress.street}</p>
                <p>
                  {billingAddress.city}, {billingAddress.state} {billingAddress.zip_code}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No billing address provided</p>
            )}
          </CardContent>
        </Card>

        {/* Shipping Address Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-600" />
                <CardTitle>Shipping Address</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={onEditAddress}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {shippingAddress?.street ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{shippingAddress.fullName}</p>
                <p className="text-gray-600">{shippingAddress.email}</p>
                <p className="text-gray-600">{shippingAddress.phone}</p>
                <p>{shippingAddress.street}</p>
                <p>
                  {shippingAddress.city}, {shippingAddress.state}{" "}
                  {shippingAddress.zip_code}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No shipping address provided</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Items Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              <CardTitle>Order Items ({cartItems.length})</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onEditProducts}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cartItems.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-4">
                {cartItems.map((item) => {
                  const isExpanded = expandedItems.has(item.productId);
                  return (
                    <div
                      key={item.productId}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      {/* Item Header */}
                      <div
                        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50 transition-all duration-200"
                        onClick={() => toggleItemExpanded(item.productId)}
                      >
                        {/* Product Image */}
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {item.name}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {item.sizes?.length || 0} size
                                {item.sizes?.length !== 1 ? "s" : ""} • Qty:{" "}
                                {item.quantity}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900">
                                ${item.price.toFixed(2)}
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-200 animate-slide-up">
                          <div className="space-y-3">
                            {/* Size Details */}
                            {item.sizes && item.sizes.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                  Size Details:
                                </p>
                                <div className="space-y-2">
                                  {item.sizes.map((size: any, index: number) => (
                                    <div
                                      key={`${size.id}-${index}`}
                                      className="flex items-center justify-between bg-white p-2 rounded text-sm"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-700">
                                          {size.size_value} {size.size_unit}
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {size.type === "unit" ? "Unit" : "Case"}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-gray-600">
                                          Qty: {size.quantity}
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                          ${(size.price * size.quantity).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Customizations */}
                            {item.customizations &&
                              Object.keys(item.customizations).length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-2">
                                    Customizations:
                                  </p>
                                  <div className="bg-white p-3 rounded space-y-1">
                                    {Object.entries(item.customizations).map(
                                      ([key, value]) => (
                                        <div
                                          key={key}
                                          className="flex justify-between text-sm"
                                        >
                                          <span className="text-gray-600 capitalize">
                                            {key.replace(/_/g, " ")}:
                                          </span>
                                          <span className="text-gray-900 font-medium">
                                            {value}
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}

                            {/* Notes */}
                            {item.notes && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                  Notes:
                                </p>
                                <div className="bg-white p-3 rounded">
                                  <p className="text-sm text-gray-900">{item.notes}</p>
                                </div>
                              </div>
                            )}

                            {/* Description */}
                            {item.description && (
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">
                                  Description:
                                </p>
                                <div className="bg-white p-3 rounded">
                                  <p className="text-sm text-gray-900">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No items in cart</p>
              <p className="text-sm text-gray-400">
                Go back to add products to your order
              </p>
              <Button 
                variant="default" 
                className="mt-4 bg-blue-600 hover:bg-blue-700"
                onClick={onEditProducts}
              >
                <Package className="h-4 w-4 mr-2" />
                Add Products
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Summary Card (Read-only) */}
      <Card className="border-2 border-blue-500">
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium text-gray-900">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax:</span>
              <span className="font-medium text-gray-900">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping:</span>
              <span className="font-medium text-gray-900">
                ${shipping.toFixed(2)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span className="text-gray-900">Total:</span>
              <span className="text-green-600">${total.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
