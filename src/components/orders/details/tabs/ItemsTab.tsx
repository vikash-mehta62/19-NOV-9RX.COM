import { OrderFormValues } from "../../schemas/orderSchema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, FileText, Edit } from "lucide-react";
import { useState } from "react";

interface ItemsTabProps {
  items: OrderFormValues["items"];
  onEdit?: () => void;
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
  orderStatus?: string;
  isVoid?: boolean;
}

export const ItemsTab = ({ items, onEdit, userRole, orderStatus, isVoid }: ItemsTabProps) => {
  const canEdit = userRole === "admin" && orderStatus !== "cancelled" && !isVoid;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          Order Items
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{items.length} {items.length === 1 ? 'Item' : 'Items'}</Badge>
          {canEdit && onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1">
              <Edit className="w-4 h-4" />
              Edit Items
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {items?.map((item, index) => (
          <Card key={index} className="p-4 hover:shadow-md transition-shadow">
            <div className="space-y-3">
              {/* Product Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-base">{item.name}</h4>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1 italic">
                      {item.description}
                    </p>
                  )}
                </div>
                {item.customizations?.availble === "yes" && (
                  <Badge variant="outline" className="ml-2">
                    Customized
                  </Badge>
                )}
              </div>

              {/* Sizes */}
              {item?.sizes && item?.sizes.length > 0 ? (
                <div className="space-y-2">
                  {item.sizes.map((size, sizeIndex) => (
                    <div
                      key={sizeIndex}
                      className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground block text-xs">Size</span>
                          <span className="font-medium">
                            {size.size_value} {size.size_unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Quantity</span>
                          <span className="font-medium">
                            {size.quantity} {size.type === "unit" ? "unit" : ""}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Price/Unit</span>
                          <span className="font-medium">${size.price.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">Total</span>
                          <span className="font-semibold text-primary">
                            ${(size.quantity * size.price).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No sizes available</p>
              )}

              {/* Notes */}
              {item.notes && (
                <div className="flex items-start gap-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-900">{item.notes}</p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Items Total */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Items Subtotal</span>
          <span className="text-xl font-bold text-primary">
            $
            {items
              .reduce((total, item) => {
                return (
                  total +
                  item.sizes.reduce((sum, size) => sum + size.quantity * size.price, 0)
                );
              }, 0)
              .toFixed(2)}
          </span>
        </div>
      </Card>
    </div>
  );
};
