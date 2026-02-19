import { useState, useCallback, useMemo } from "react";
import { OrderFormValues } from "../../schemas/orderSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Package, FileText, Edit, ShoppingCart, 
  Tag, Hash, DollarSign, Layers, AlertCircle,
  Plus, Trash2, Save, X, Check, Search
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ProductShowcase from "@/components/pharmacy/ProductShowcase";
import { ProductSelectionStep } from "@/components/orders/wizard/steps/ProductSelectionStep";
import { useCart } from "@/hooks/use-cart";
import { ScrollArea } from "@/components/ui/scroll-area";
import PaymentAdjustmentModal from "@/components/orders/PaymentAdjustmentModal";

interface ItemsTabProps {
  items: OrderFormValues["items"];
  onEdit?: () => void;
  onItemsUpdate?: (items: OrderFormValues["items"]) => void;
  orderId?: string;
  customerId?: string;
  orderNumber?: string;
  customerEmail?: string;
  paymentStatus?: string;
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
  orderStatus?: string;
  isVoid?: boolean;
  onOrderUpdate?: () => void;
  shippingCost?: number;
  taxAmount?: number;
  discountAmount?: number;
}

export const ItemsTab = ({ 
  items, 
  onEdit, 
  onItemsUpdate,
  orderId,
  customerId,
  orderNumber,
  customerEmail,
  paymentStatus,
  userRole, 
  orderStatus, 
  isVoid,
  onOrderUpdate,
  shippingCost = 0,
  taxAmount = 0,
  discountAmount = 0
}: ItemsTabProps) => {
  const { toast } = useToast();
  const { cartItems, clearCart } = useCart();
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState<OrderFormValues["items"]>(items);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  
  // Payment adjustment state
  const [isPaymentAdjustmentOpen, setIsPaymentAdjustmentOpen] = useState(false);
  const [paymentAdjustmentData, setPaymentAdjustmentData] = useState<any>(null);
  const [pendingEditData, setPendingEditData] = useState<any>(null);
  
  const canEdit = userRole === "admin" && orderStatus !== "cancelled" && !isVoid;
  
  // Calculate totals
  const { totalItems, subtotal } = useMemo(() => {
    const currentItems = isEditMode ? editedItems : items;
    const total = currentItems.reduce(
      (acc, item) => acc + item.sizes.reduce((sum, size) => sum + size.quantity, 0),
      0
    );
    const sub = currentItems.reduce((acc, item) => {
      return acc + item.sizes.reduce((sum, size) => sum + size.quantity * size.price, 0);
    }, 0);
    return { totalItems: total, subtotal: sub };
  }, [items, editedItems, isEditMode]);

  // Handle entering edit mode
  const handleEnterEditMode = useCallback(() => {
    setEditedItems([...items]);
    setIsEditMode(true);
  }, [items]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditedItems([...items]);
    setIsEditMode(false);
  }, [items]);

  // Handle quantity change
  const handleQuantityChange = useCallback((itemIndex: number, sizeIndex: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setEditedItems(prev => {
      const updated = [...prev];
      updated[itemIndex] = {
        ...updated[itemIndex],
        sizes: updated[itemIndex].sizes.map((size, idx) => 
          idx === sizeIndex ? { ...size, quantity: newQuantity } : size
        )
      };
      return updated;
    });
  }, []);

  // Handle price change
  const handlePriceChange = useCallback((itemIndex: number, sizeIndex: number, newPrice: number) => {
    if (newPrice < 0) return;
    
    setEditedItems(prev => {
      const updated = [...prev];
      updated[itemIndex] = {
        ...updated[itemIndex],
        sizes: updated[itemIndex].sizes.map((size, idx) => 
          idx === sizeIndex ? { ...size, price: newPrice } : size
        )
      };
      return updated;
    });
  }, []);

  // Handle delete item
  const handleDeleteItem = useCallback((itemIndex: number) => {
    setEditedItems(prev => prev.filter((_, idx) => idx !== itemIndex));
  }, []);

  // Handle delete size from item
  const handleDeleteSize = useCallback((itemIndex: number, sizeIndex: number) => {
    setEditedItems(prev => {
      const updated = [...prev];
      const newSizes = updated[itemIndex].sizes.filter((_, idx) => idx !== sizeIndex);
      
      // If no sizes left, remove the entire item
      if (newSizes.length === 0) {
        return prev.filter((_, idx) => idx !== itemIndex);
      }
      
      updated[itemIndex] = {
        ...updated[itemIndex],
        sizes: newSizes
      };
      return updated;
    });
  }, []);

  // Calculate original total from items
  const originalTotal = useMemo(() => {
    const itemsSubtotal = items.reduce((acc, item) => {
      return acc + item.sizes.reduce((sum, size) => sum + size.quantity * size.price, 0);
    }, 0);
    return itemsSubtotal + shippingCost + taxAmount - discountAmount;
  }, [items, shippingCost, taxAmount, discountAmount]);

  // Handle save changes
  const handleSaveChanges = useCallback(async () => {
    if (!orderId) {
      toast({
        title: "Error",
        description: "Order ID is missing",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Calculate new totals
      const newSubtotal = editedItems.reduce((acc, item) => {
        return acc + item.sizes.reduce((sum, size) => sum + size.quantity * size.price, 0);
      }, 0);

      // Get current order to preserve other values and check payment status
      const { data: currentOrder, error: fetchError } = await supabase
        .from("orders")
        .select("tax_amount, shipping_cost, discount_amount, payment_status, total_amount, order_number, location_id, profile_id, paid_amount")
        .eq("id", orderId)
        .single();

      if (fetchError) throw fetchError;

      const orderTaxAmount = currentOrder?.tax_amount || 0;
      const orderShippingCost = parseFloat(currentOrder?.shipping_cost || "0");
      const orderDiscountAmount = Number(currentOrder?.discount_amount || 0);
      // Correct formula: Total = Subtotal + Shipping + Tax - Discount
      const newTotal = newSubtotal + orderShippingCost + orderTaxAmount - orderDiscountAmount;
      const originalAmount = Number(currentOrder?.total_amount || 0);

      // Get the paid_amount - if not set and order is paid, use original total_amount
      let paidAmount = Number(currentOrder?.paid_amount || 0);
      if (paidAmount === 0 && currentOrder?.payment_status === 'paid') {
        paidAmount = originalAmount;
      }

      // If this is a paid order and paid_amount is not set, set it now
      // This ensures we track the original paid amount before any modifications
      if (currentOrder?.payment_status === 'paid' && (!currentOrder?.paid_amount || currentOrder.paid_amount === 0)) {
        // Update paid_amount in database to preserve original paid amount
        await supabase
          .from("orders")
          .update({ paid_amount: originalAmount })
          .eq("id", orderId);
        
        // Also update invoice if exists
        const { data: invoiceData } = await supabase
          .from('invoices')
          .select('id')
          .eq('order_id', orderId)
          .maybeSingle();
        
        if (invoiceData) {
          await supabase
            .from("invoices")
            .update({ paid_amount: originalAmount })
            .eq("id", invoiceData.id);
        }
        
        console.log(`💰 Set paid_amount for order ${orderId}: $${originalAmount}`);
      }

      // Check if payment adjustment is needed (only for paid orders with price change)
      // Use paid_amount for comparison instead of total_amount
      // ALWAYS show payment adjustment modal for ALL saves
      const customerIdToUse = customerId || currentOrder?.location_id || currentOrder?.profile_id;
    
      const { data: customerProfile } = await supabase
        .from("profiles")
        .select("credit_limit, credit_used, credit_memo_balance, company_name, first_name, last_name, email")
        .eq("id", customerIdToUse)
        .single();

      const hasCredit = (customerProfile?.credit_limit || 0) > 0;
      const availableCredit = Math.max(0, (customerProfile?.credit_limit || 0) - (customerProfile?.credit_used || 0));
      const creditMemoBalance = customerProfile?.credit_memo_balance || 0;
      const customerName = customerProfile?.company_name || 
        `${customerProfile?.first_name || ''} ${customerProfile?.last_name || ''}`.trim() || 
        'Customer';

      // Store pending data and show payment adjustment modal
      setPendingEditData({
        editedItems,
        newSubtotal,
        newTotal,
      });

      setPaymentAdjustmentData({
        orderId,
        orderNumber: orderNumber || currentOrder?.order_number || '',
        customerId: customerIdToUse,
        customerName,
        customerEmail: customerEmail || customerProfile?.email,
        originalAmount: paidAmount > 0 ? paidAmount : originalAmount, // Use paid_amount if available
        newAmount: newTotal,
        hasCredit,
        availableCredit,
        creditMemoBalance,
        orderData: {
          items: editedItems,
          tax_amount: orderTaxAmount,
          shipping_cost: orderShippingCost,
          customerInfo: {
            name: customerName,
            email: customerEmail || customerProfile?.email,
          },
        },
      });

      setIsSaving(false);
      setIsPaymentAdjustmentOpen(true);

    } catch (error) {
      console.error("Error saving items:", error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
      setIsSaving(false);
    }
  }, [orderId, editedItems, customerId, orderNumber, customerEmail, toast]);

  // Actual save function (called directly or after payment adjustment)
  const saveOrderChanges = useCallback(async (itemsToSave: any[], newSubtotal: number, newTotal: number, newPaymentStatus?: string) => {
    try {
      // Get current order data for activity logging
      const { data: currentOrderData } = await supabase
        .from("orders")
        .select("total_amount, items, order_number, payment_status, paid_amount, profile_id, location_id, payment_method")
        .eq("id", orderId)
        .single();

      const oldTotal = Number(currentOrderData?.total_amount || 0);
      const oldItemCount = currentOrderData?.items?.length || 0;
      const newItemCount = itemsToSave.length;
      const paidAmount = Number(currentOrderData?.paid_amount || 0);
      const customerIdForPoints = currentOrderData?.location_id || currentOrderData?.profile_id;

      // Determine if payment status should change
      let updatePaymentStatus = newPaymentStatus;
      if (!updatePaymentStatus && paidAmount > 0 && newTotal > paidAmount) {
        updatePaymentStatus = 'partial_paid';
      }

      // Build update object
      const orderUpdate: any = {
        items: itemsToSave,
        total_amount: newTotal,
      };
      
      if (updatePaymentStatus) {
        orderUpdate.payment_status = updatePaymentStatus;
      }

      // Update order in database
      const { error } = await supabase
        .from("orders")
        .update(orderUpdate)
        .eq("id", orderId);

      if (error) throw error;

      // Update invoice if exists
      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("id")
        .eq("order_id", orderId)
        .maybeSingle();

      if (invoiceData) {
        const invoiceUpdate: any = {
          items: itemsToSave,
          subtotal: newSubtotal,
          total_amount: newTotal,
        };
        
        if (updatePaymentStatus) {
          invoiceUpdate.payment_status = updatePaymentStatus;
        }
        
        await supabase
          .from("invoices")
          .update(invoiceUpdate)
          .eq("id", invoiceData.id);
      }

      // Adjust reward points if order total changed (only for non-credit orders)
      if (oldTotal !== newTotal && currentOrderData?.payment_method !== 'credit' && customerIdForPoints) {
        try {
          console.log('🎁 Adjusting reward points for order edit...');
          const { adjustRewardPointsForOrderEdit } = await import("@/services/rewardPointsAdjustmentService");
          
          const adjustmentResult = await adjustRewardPointsForOrderEdit(
            customerIdForPoints,
            orderId!,
            oldTotal,
            newTotal,
            currentOrderData?.order_number || ''
          );

          if (adjustmentResult.success && adjustmentResult.pointsAdjusted !== 0) {
            const pointsChange = adjustmentResult.pointsAdjusted;
            const changeType = pointsChange > 0 ? 'added' : 'deducted';
            const absPoints = Math.abs(pointsChange);
            
            toast({
              title: "Reward Points Adjusted",
              description: `${absPoints} points ${changeType} due to order total change`,
              duration: 4000,
            });
            
            console.log(`✅ Reward points adjusted: ${pointsChange > 0 ? '+' : ''}${pointsChange} points`);
          } else if (!adjustmentResult.success && adjustmentResult.error) {
            console.warn('⚠️  Reward points adjustment skipped:', adjustmentResult.error);
          }
        } catch (rewardError) {
          console.error('❌ Error adjusting reward points:', rewardError);
          // Don't throw - order update was successful
        }
      }

      // Log activity for items change
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { OrderActivityService } = await import("@/services/orderActivityService");
        
        let activityDescription = `Order items modified. Total changed from $${oldTotal.toFixed(2)} to $${newTotal.toFixed(2)}`;
        if (updatePaymentStatus === 'partial_paid') {
          const balanceDue = newTotal - paidAmount;
          activityDescription += `. Balance due: $${balanceDue.toFixed(2)}`;
        }

        await OrderActivityService.logActivity({
          orderId: orderId!,
          activityType: "updated",
          description: activityDescription,
          performedBy: session?.user?.id,
          performedByName: session?.user?.user_metadata?.first_name || "Admin",
          performedByEmail: session?.user?.email,
          oldData: { 
            total_amount: oldTotal, 
            item_count: oldItemCount,
            items: currentOrderData?.items 
          },
          newData: { 
            total_amount: newTotal, 
            item_count: newItemCount,
            items: itemsToSave 
          },
          metadata: {
            order_number: currentOrderData?.order_number,
            change_type: "items_modified",
            amount_difference: newTotal - oldTotal,
          },
        });
      } catch (activityError) {
        console.error("Failed to log items change activity:", activityError);
      }

      // Call the callback to update parent state
      if (onItemsUpdate) {
        onItemsUpdate(itemsToSave);
      }
      
      if (onOrderUpdate) {
        onOrderUpdate();
      }

      setIsEditMode(false);
      toast({
        title: "Success",
        description: "Order items updated successfully",
      });
    } catch (error) {
      console.error("Error saving items:", error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [orderId, onItemsUpdate, onOrderUpdate, toast]);

  // Handle payment adjustment completion
  const handlePaymentAdjustmentComplete = useCallback(async (result: { success: boolean; adjustmentType: string; transactionId?: string }) => {
    if (!result.success || !pendingEditData) {
      setIsPaymentAdjustmentOpen(false);
      setPendingEditData(null);
      setPaymentAdjustmentData(null);
      return;
    }

    setIsSaving(true);
    try {
      const { editedItems: itemsToSave, newSubtotal, newTotal } = pendingEditData;
      await saveOrderChanges(itemsToSave, newSubtotal, newTotal);
      
      toast({
        title: "Success",
        description: `Order updated with payment adjustment (${result.adjustmentType})`,
      });
    } catch (error) {
      console.error("Error after payment adjustment:", error);
      toast({
        title: "Error",
        description: "Failed to update order after payment adjustment",
        variant: "destructive",
      });
    } finally {
      setIsPaymentAdjustmentOpen(false);
      setPendingEditData(null);
      setPaymentAdjustmentData(null);
      setIsSaving(false);
    }
  }, [pendingEditData, saveOrderChanges, toast]);

  // Handle add products from cart
  const handleAddProductsFromCart = useCallback(async () => {
    if (cartItems.length === 0) {
      toast({
        title: "No Products",
        description: "Please add products to cart first",
        variant: "destructive",
      });
      return;
    }

    // Convert cart items to order items format
    const newItems = cartItems.map(cartItem => ({
      productId: cartItem.productId,
      name: cartItem.name,
      quantity: cartItem.quantity,
      price: cartItem.price,
      sizes: cartItem.sizes || [],
      notes: cartItem.description || "",
      customizations: {},
    }));

    // Merge with existing items (check for duplicates by productId)
    const mergedItems = [...editedItems];
    
    newItems.forEach(newItem => {
      const existingIndex = mergedItems.findIndex(item => item.productId === newItem.productId);
      
      if (existingIndex >= 0) {
        // Merge sizes for existing product
        const existingItem = mergedItems[existingIndex];
        newItem.sizes.forEach(newSize => {
          const existingSizeIndex = existingItem.sizes.findIndex(
            s => s.id === newSize.id && s.type === newSize.type
          );
          
          if (existingSizeIndex >= 0) {
            // Add quantity to existing size
            existingItem.sizes[existingSizeIndex].quantity += newSize.quantity;
          } else {
            // Add new size
            existingItem.sizes.push(newSize);
          }
        });
      } else {
        // Add as new item
        mergedItems.push(newItem);
      }
    });

    setEditedItems(mergedItems);
    await clearCart();
    setShowAddProductDialog(false);
    
    toast({
      title: "Products Added",
      description: `${newItems.length} product(s) added to order`,
    });
  }, [cartItems, editedItems, clearCart, toast]);

  const currentItems = isEditMode ? editedItems : items;

  if (!currentItems || currentItems.length === 0) {
    return (
      <div className="space-y-4">
        {canEdit && (
          <div className="flex justify-end">
            <Button 
              onClick={() => {
                setIsEditMode(true);
                setShowAddProductDialog(true);
              }} 
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Products
            </Button>
          </div>
        )}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No items in this order</p>
            <p className="text-sm text-gray-400 mt-1">Items will appear here once added</p>
          </CardContent>
        </Card>
        
        {/* Add Product Dialog */}
        <AddProductDialog 
          open={showAddProductDialog}
          onOpenChange={setShowAddProductDialog}
          onAddProducts={handleAddProductsFromCart}
          cartItemsCount={cartItems.length}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-violet-50 to-purple-50 border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <ShoppingCart className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Order Items</CardTitle>
                <p className="text-sm text-gray-500 mt-0.5">
                  {currentItems.length} product{currentItems.length !== 1 ? 's' : ''} • {totalItems} unit{totalItems !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                {currentItems.length} {currentItems.length === 1 ? 'Item' : 'Items'}
              </Badge>
              
              {canEdit && !isEditMode && (
                <Button variant="outline" size="sm" onClick={handleEnterEditMode} className="gap-1.5 bg-white">
                  <Edit className="w-4 h-4" />
                  Edit Items
                </Button>
              )}
              
              {isEditMode && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowAddProductDialog(true)} 
                    className="gap-1.5 bg-white"
                  >
                    <Plus className="w-4 h-4" />
                    Add Product
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleCancelEdit} 
                    className="gap-1.5"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSaveChanges} 
                    disabled={isSaving}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSaving ? (
                      <>Saving...</>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Items List */}
      <div className="space-y-4">
        {currentItems?.map((item, index) => (
          <Card key={index} className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
            {/* Product Header */}
            <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 border-b">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Package className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.customizations?.availble === "yes" && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <Tag className="w-3 h-3 mr-1" />
                      Customized
                    </Badge>
                  )}
                  {isEditMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Sizes Table */}
            <CardContent className="p-0">
              {item?.sizes && item?.sizes.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {/* Table Header */}
                  <div className={`grid ${isEditMode ? 'grid-cols-5' : 'grid-cols-4'} gap-4 px-4 py-3 bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider`}>
                    <div className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      Size
                    </div>
                    <div className="flex items-center gap-1">
                      <Hash className="w-3.5 h-3.5" />
                      Quantity
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" />
                      Unit Price
                    </div>
                    <div className="text-right">Total</div>
                    {isEditMode && <div className="text-center">Action</div>}
                  </div>
                  
                  {/* Size Rows */}
                  {item.sizes.map((size, sizeIndex) => (
                    <div
                      key={sizeIndex}
                      className={`grid ${isEditMode ? 'grid-cols-5' : 'grid-cols-4'} gap-4 px-4 py-3 hover:bg-gray-50 transition-colors items-center`}
                    >
                      <div>
                        <span className="font-medium text-gray-900">
                          {size.size_value} {size.size_unit}
                        </span>
                        {(size as any).sku && (
                          <p className="text-xs text-gray-400">SKU: {(size as any).sku}</p>
                        )}
                      </div>
                      <div>
                        {isEditMode ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleQuantityChange(index, sizeIndex, size.quantity - 1)}
                              disabled={size.quantity <= 1}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={size.quantity}
                              onChange={(e) => handleQuantityChange(index, sizeIndex, parseInt(e.target.value) || 1)}
                              className="w-16 h-8 text-center"
                              min={1}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleQuantityChange(index, sizeIndex, size.quantity + 1)}
                            >
                              +
                            </Button>
                          </div>
                        ) : (
                          <span className="font-medium text-gray-900">
                            {size.quantity}
                            {size.type && (
                              <span className="text-gray-500 text-sm ml-1">
                                {size.type.toLowerCase()}{size.quantity > 1 ? 's' : ''}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                      <div>
                        {isEditMode ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">$</span>
                            <Input
                              type="number"
                              value={size.price}
                              onChange={(e) => handlePriceChange(index, sizeIndex, parseFloat(e.target.value) || 0)}
                              className="w-24 h-8"
                              min={0}
                              step={0.01}
                            />
                          </div>
                        ) : (
                          <span className="font-medium text-gray-900">${size.price.toFixed(2)}</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-emerald-600">
                          ${(size.quantity * size.price).toFixed(2)}
                        </span>
                      </div>
                      {isEditMode && (
                        <div className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSize(index, sizeIndex)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Item Subtotal */}
                  <div className={`grid ${isEditMode ? 'grid-cols-5' : 'grid-cols-4'} gap-4 px-4 py-3 bg-gray-50`}>
                    <div className={`${isEditMode ? 'col-span-3' : 'col-span-3'} text-right font-medium text-gray-600`}>
                      Item Subtotal:
                    </div>
                    <div className="text-right font-bold text-gray-900">
                      ${item.sizes.reduce((sum, size) => sum + size.quantity * size.price, 0).toFixed(2)}
                    </div>
                    {isEditMode && <div></div>}
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400 italic">
                  No sizes available
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <div className="p-4 border-t bg-blue-50/50">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Item Notes</p>
                      <p className="text-sm text-blue-900">{item.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Summary */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <CardContent className="p-0">
          {/* Subtotal, Shipping, Tax breakdown */}
          <div className="p-4 space-y-2 bg-gray-50 border-b">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Items Subtotal ({totalItems} items)</span>
              <span className="font-medium text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            {shippingCost > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium text-gray-900">${shippingCost.toFixed(2)}</span>
              </div>
            )}
            {taxAmount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium text-gray-900">${taxAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
          
          {/* Grand Total */}
          <div className="bg-gradient-to-r from-blue-500 to-teal-500 p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-blue-100 text-sm font-medium">Order Total</p>
                  <p className="text-xs text-blue-200">{totalItems} items</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-white">
                ${(subtotal + shippingCost + taxAmount).toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <AddProductDialog 
        open={showAddProductDialog}
        onOpenChange={setShowAddProductDialog}
        onAddProducts={handleAddProductsFromCart}
        cartItemsCount={cartItems.length}
      />

      {/* Payment Adjustment Modal for Paid Orders */}
      {isPaymentAdjustmentOpen && paymentAdjustmentData && (
        <PaymentAdjustmentModal
          open={isPaymentAdjustmentOpen}
          onOpenChange={(open) => {
            setIsPaymentAdjustmentOpen(open);
            if (!open) {
              setPendingEditData(null);
              setPaymentAdjustmentData(null);
            }
          }}
          orderId={paymentAdjustmentData.orderId}
          orderNumber={paymentAdjustmentData.orderNumber}
          customerId={paymentAdjustmentData.customerId}
          customerName={paymentAdjustmentData.customerName}
          customerEmail={paymentAdjustmentData.customerEmail || customerEmail}
          originalAmount={paymentAdjustmentData.originalAmount}
          newAmount={paymentAdjustmentData.newAmount}
          hasCredit={paymentAdjustmentData.hasCredit}
          availableCredit={paymentAdjustmentData.availableCredit}
          creditMemoBalance={paymentAdjustmentData.creditMemoBalance}
          orderData={paymentAdjustmentData.orderData}
          onPaymentComplete={handlePaymentAdjustmentComplete}
        />
      )}

    </div>
  );
};

// Add Product Dialog Component
interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProducts: () => void;
  cartItemsCount: number;
}

interface ProductSize {
  id: string;
  size_value: string;
  size_unit: string;
  price: number;
  originalPrice?: number;
  stock: number;
  sku?: string;
  quantity_per_case?: number;
  image?: string;
}

interface SelectedProduct {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  images?: string[];
  sizes: ProductSize[];
  category?: string;
  subcategory?: string;
}

const AddProductDialog = ({ open, onOpenChange, onAddProducts, cartItemsCount }: AddProductDialogProps) => {
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null);
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({});
  const { addToCart } = useCart();
  const { toast } = useToast();

  const handleProductClick = (product: any) => {
    setSelectedProduct(product);
    // Initialize quantities to 0 for all sizes
    const initialQuantities: Record<string, number> = {};
    product.sizes?.forEach((size: ProductSize) => {
      initialQuantities[size.id] = 0;
    });
    setSizeQuantities(initialQuantities);
  };

  const handleBackToProducts = () => {
    setSelectedProduct(null);
    setSizeQuantities({});
  };

  const handleQuantityChange = (sizeId: string, quantity: number) => {
    setSizeQuantities(prev => ({
      ...prev,
      [sizeId]: Math.max(0, quantity)
    }));
  };

  const handleAddSelectedSizes = async () => {
    if (!selectedProduct) return;

    const sizesToAdd = selectedProduct.sizes.filter(
      size => sizeQuantities[size.id] > 0
    );

    if (sizesToAdd.length === 0) {
      toast({
        title: "No sizes selected",
        description: "Please select at least one size with quantity",
        variant: "destructive",
      });
      return;
    }

    // Add each selected size to cart
    for (const size of sizesToAdd) {
      const quantity = sizeQuantities[size.id];
      await addToCart({
        productId: selectedProduct.id,
        name: selectedProduct.name,
        sku: selectedProduct.sku || "",
        description: selectedProduct.description || "",
        price: size.price,
        image: getProductImage(),
        quantity: quantity,
        sizes: [{
          id: size.id,
          size_value: size.size_value,
          size_unit: size.size_unit,
          price: size.price,
          quantity: quantity,
          type: "case",
          sku: size.sku || "",
        }],
        customizations: {},
        notes: "",
        shipping_cost: 0,
      });
    }

    toast({
      title: "Added to cart",
      description: `${sizesToAdd.length} size(s) added to cart`,
    });

    handleBackToProducts();
  };

  const getProductImage = () => {
    if (!selectedProduct) return "/placeholder.svg";
    const basePath = "https://asnhfgfhidhzswqkhpzz.supabase.co/storage/v1/object/public/product-images/";
    if (selectedProduct.images && selectedProduct.images.length > 0) {
      if (selectedProduct.images[0].startsWith("http")) return selectedProduct.images[0];
      return basePath + selectedProduct.images[0];
    }
    return selectedProduct.image_url || "/placeholder.svg";
  };

  const totalSelectedItems = Object.values(sizeQuantities).reduce((sum, qty) => sum + qty, 0);
  const totalSelectedAmount = selectedProduct?.sizes.reduce((sum, size) => {
    return sum + (size.price * (sizeQuantities[size.id] || 0));
  }, 0) || 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setSelectedProduct(null);
        setSizeQuantities({});
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedProduct ? (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleBackToProducts}
                  className="mr-2 h-8 px-2"
                >
                  <X className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Package className="w-5 h-5" />
                {selectedProduct.name}
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Add Products to Order
              </>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="h-[75vh] overflow-hidden">
          {selectedProduct ? (
            // Product Detail View with Sizes
            <div className="space-y-4">
              {/* Product Header */}
              <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                <img 
                  src={getProductImage()} 
                  alt={selectedProduct.name}
                  className="w-24 h-24 object-contain rounded-lg bg-white p-2"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedProduct.name}</h3>
                  {selectedProduct.description && (
                    <p className="text-sm text-gray-600 mt-1">{selectedProduct.description}</p>
                  )}
                  <div className="flex gap-2 mt-2">
                    {selectedProduct.category && (
                      <Badge variant="outline">{selectedProduct.category}</Badge>
                    )}
                    {selectedProduct.subcategory && (
                      <Badge variant="secondary">{selectedProduct.subcategory}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Sizes Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-6 gap-4 px-4 py-3 bg-gray-100 text-xs font-semibold text-gray-600 uppercase">
                  <div>Size</div>
                  <div>SKU</div>
                  <div>Price/Case</div>
                  <div>Stock</div>
                  <div>Quantity</div>
                  <div className="text-right">Total</div>
                </div>
                
                {selectedProduct.sizes && selectedProduct.sizes.length > 0 ? (
                  selectedProduct.sizes.map((size) => (
                    <div 
                      key={size.id} 
                      className="grid grid-cols-6 gap-4 px-4 py-3 border-t items-center hover:bg-gray-50"
                    >
                      <div className="font-medium">
                        {size.size_value} {size.size_unit}
                      </div>
                      <div className="text-sm text-gray-500">
                        {size.sku || '-'}
                      </div>
                      <div>
                        <span className="font-semibold text-emerald-600">${size.price.toFixed(2)}</span>
                        {size.originalPrice && size.originalPrice > size.price && (
                          <span className="text-xs text-gray-400 line-through ml-1">
                            ${size.originalPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div>
                        <Badge 
                          variant={size.stock > 0 ? "secondary" : "destructive"}
                          className={size.stock > 0 ? "bg-emerald-100 text-emerald-700" : ""}
                        >
                          {size.stock > 0 ? `${size.stock} in stock` : 'Out of stock'}
                        </Badge>
                      </div>
                      <div>
                        {size.stock > 0 ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleQuantityChange(size.id, (sizeQuantities[size.id] || 0) - 1)}
                              disabled={!sizeQuantities[size.id]}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={sizeQuantities[size.id] || 0}
                              onChange={(e) => handleQuantityChange(size.id, parseInt(e.target.value) || 0)}
                              className="w-16 h-8 text-center"
                              min={0}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => handleQuantityChange(size.id, (sizeQuantities[size.id] || 0) + 1)}
                            >
                              +
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </div>
                      <div className="text-right font-semibold">
                        ${((sizeQuantities[size.id] || 0) * size.price).toFixed(2)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    No sizes available for this product
                  </div>
                )}
              </div>

              {/* Selection Summary */}
              {totalSelectedItems > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-blue-800">
                        {totalSelectedItems} case{totalSelectedItems !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="text-lg font-bold text-emerald-700">
                      Total: ${totalSelectedAmount.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Use the new responsive ProductSelectionStep interface
            <div className="h-full">
              <ProductSelectionStep onCartUpdate={() => {}} />
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-gray-600">
              {selectedProduct ? (
                totalSelectedItems > 0 ? (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    {totalSelectedItems} case{totalSelectedItems !== 1 ? 's' : ''} • ${totalSelectedAmount.toFixed(2)}
                  </Badge>
                ) : (
                  <span>Select sizes and quantities</span>
                )
              ) : cartItemsCount > 0 ? (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {cartItemsCount} product{cartItemsCount !== 1 ? 's' : ''} in cart
                </Badge>
              ) : (
                <span>Click on a product to view sizes</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {selectedProduct ? (
                <Button 
                  onClick={handleAddSelectedSizes}
                  disabled={totalSelectedItems === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              ) : (
                <Button 
                  onClick={onAddProducts}
                  disabled={cartItemsCount === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Add {cartItemsCount > 0 ? `${cartItemsCount} Product${cartItemsCount !== 1 ? 's' : ''}` : 'Products'}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
