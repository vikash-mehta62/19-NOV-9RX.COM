import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Download, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateOrderForm } from "../CreateOrderForm";
import { OrderFormValues } from "../schemas/orderSchema";
import { OrderHeader } from "../details/OrderHeader";
import { OverviewTab } from "../details/tabs/OverviewTab";
import { ItemsTab } from "../details/tabs/ItemsTab";
import { CustomerTab } from "../details/tabs/CustomerTab";
import { PaymentTab } from "../details/tabs/PaymentTab";
import { ShippingTab } from "../details/tabs/ShippingTab";
import { ActivityTab } from "../details/tabs/ActivityTab";
import { OrderActions } from "./OrderActions";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import axios from "../../../../axiosconfig";
import { useCart } from "@/hooks/use-cart";
import jsPDF from "jspdf";
import JsBarcode from "jsbarcode";
import Swal from "sweetalert2";
import { ChargesDialog } from "./ChargesDialog";
import { PackingSlipModal } from "../PackingSlipModal";

interface OrderDetailsSheetProps {
  order: OrderFormValues;
  isEditing: boolean;
  poIs?: boolean;
  setIsEditing: (value: boolean) => void;
  loadOrders?: (poIs) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcessOrder?: (orderId: string) => void;
  onShipOrder?: (orderId: string) => void;
  onConfirmOrder?: (orderId: string) => void;
  onDeleteOrder?: (orderId: string) => Promise<void>;
  userRole?: "admin" | "pharmacy" | "group" | "hospital";
}

export const OrderDetailsSheet = ({
  order,
  isEditing,
  setIsEditing,
  open,
  onOpenChange,
  onProcessOrder,
  onShipOrder,
  onConfirmOrder,
  onDeleteOrder,
  poIs = false,
  loadOrders,
  userRole = "pharmacy",
}: OrderDetailsSheetProps) => {
  const { toast } = useToast();
  const { clearCart } = useCart();
  const [currentOrder, setCurrentOrder] = useState<OrderFormValues>(order);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingQuick, setLoadingQuick] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [chargesOpen, setChargesOpen] = useState(false);
  const [isPackingSlipModalOpen, setIsPackingSlipModalOpen] = useState(false);

  // Update currentOrder when order prop changes
  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  // Fetch company name
  const fetchUser = async () => {
    try {
      if (!currentOrder || !currentOrder.customer) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("id", currentOrder.customer)
        .maybeSingle();

      if (error) {
        console.error("Supabase Fetch Error:", error);
        return;
      }

      if (data) {
        setCompanyName(data.company_name || "");
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [currentOrder]);

  // Clear cart when editing
  useEffect(() => {
    const clearCartIfEditing = async () => {
      if (isEditing) {
        await clearCart();
      }
    };
    clearCartIfEditing();
  }, [isEditing, clearCart]);

  const handleStatusUpdate = async (action: "process" | "ship" | "confirm") => {
    if (!currentOrder.id) return;

    try {
      switch (action) {
        case "process":
          if (onProcessOrder) {
            await onProcessOrder(currentOrder.id);
            setCurrentOrder((prev) => ({ ...prev, status: "processing" }));
          }
          break;
        case "ship":
          if (onShipOrder) {
            await onShipOrder(currentOrder.id);
            setCurrentOrder((prev) => ({ ...prev, status: "shipped" }));
          }
          break;
        case "confirm":
          if (onConfirmOrder) {
            await onConfirmOrder(currentOrder.id);
            setCurrentOrder((prev) => ({ ...prev, status: "processing" }));
          }
          break;
      }
    } catch (error) {
      console.error(`Error updating order status:`, error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const sendMail = async () => {
    setLoading(true);
    try {
      await axios.post("/paynow-user", order);
      toast({
        title: "Payment Link sent successfully",
        description: "",
        variant: "default",
      });
    } catch (apiError) {
      console.error("Failed to send order status to backend:", apiError);
      toast({
        title: "Error",
        description: "Failed to send payment link",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const quickBookUpdate = async () => {
    setLoadingQuick(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          profiles (
            first_name, 
            last_name, 
            email, 
            mobile_phone, 
            type, 
            company_name
          )
          `
        )
        .eq("id", currentOrder.id)
        .single();

      if (error) {
        console.error("Error fetching order:", error);
        throw error;
      }

      const quickBook = await axios.post("/invoice-quickbook", data);

      if (quickBook?.status === 200) {
        const invoiceId = quickBook?.data?.data?.Invoice?.Id;

        const { error: updateError } = await supabase
          .from("orders")
          .update({ quickBooksID: invoiceId })
          .eq("id", currentOrder.id);

        if (updateError) {
          console.error("Error updating order with QuickBooks ID:", updateError);
        } else {
          await loadOrders?.(poIs);
          setCurrentOrder({ ...currentOrder, quickBooksID: invoiceId });
          toast({
            title: "Success",
            description: "QuickBooks updated successfully",
          });
        }
      }
    } catch (error) {
      console.error("Error in quickBookUpdate:", error);
      toast({
        title: "Error",
        description: "Failed to update QuickBooks",
        variant: "destructive",
      });
    } finally {
      setLoadingQuick(false);
    }
  };

  const formattedDate = new Date(currentOrder.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  });

  const generateBarcode = (text: string): string => {
    const canvas = document.createElement("canvas");
    JsBarcode(canvas, text, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: false,
      margin: 0,
    });
    return canvas.toDataURL("image/png");
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;

      // Add Logo
      const logo = new Image();
      logo.src = "/final.png";
      await new Promise((resolve) => (logo.onload = resolve));
      const logoHeight = 23;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      doc.addImage(logo, "PNG", pageWidth / 2 - logoWidth / 2, margin, logoWidth, logoHeight);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const topInfo = [
        "Tax ID : 99-0540972",
        "936 Broad River Ln, Charlotte, NC 28211",
        "info@9rx.com",
        "www.9rx.com",
      ].join("     |     ");
      doc.text(topInfo, pageWidth / 2, margin - 2, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("+1 800 969 6295", margin, margin + 10);

      doc.text("PURCHASE ORDER", pageWidth - margin - 5, margin + 10, { align: "right" });

      doc.setFontSize(10);
      doc.text(`ORDER - ${currentOrder.order_number}`, pageWidth - margin - 5, margin + 15, {
        align: "right",
      });
      doc.text(`Date - ${formattedDate}`, pageWidth - margin - 5, margin + 20, { align: "right" });

      doc.setDrawColor(200);
      doc.line(margin, margin + 26, pageWidth - margin, margin + 26);

      const infoStartY = margin + 35;
      doc.setFont("helvetica", "bold").setFontSize(11).text("Vendor", margin, infoStartY);
      doc.setFont("helvetica", "normal").setFontSize(9);
      doc.text(companyName, margin, infoStartY + 5);
      doc.text(currentOrder.customerInfo?.name || "N/A", margin, infoStartY + 10);
      doc.text(currentOrder.customerInfo?.phone || "N/A", margin, infoStartY + 15);
      doc.text(currentOrder.customerInfo?.email || "N/A", margin, infoStartY + 20);
      doc.text(
        `${(currentOrder.shippingAddress as any)?.billing?.street1 || ""} ${(currentOrder.shippingAddress as any)?.billing?.city || ""
        }, ${(currentOrder.shippingAddress as any)?.billing?.state || ""} ${(currentOrder.shippingAddress as any)?.billing?.zipCode || ""
        }`,
        margin,
        infoStartY + 25,
        { maxWidth: pageWidth / 2 - margin }
      );

      doc.setFont("helvetica", "bold").setFontSize(11).text("Ship To", pageWidth / 2, infoStartY);
      doc.setFont("helvetica", "normal").setFontSize(9);
      doc.text("9RX", pageWidth / 2, infoStartY + 5);
      doc.text(currentOrder.customerInfo?.name || "N/A", pageWidth / 2, infoStartY + 10);
      doc.text((currentOrder.shippingAddress as any)?.shipping?.phone || "N/A", pageWidth / 2, infoStartY + 15);
      doc.text(currentOrder.customerInfo?.email || "N/A", pageWidth / 2, infoStartY + 20);
      doc.text(
        `${(currentOrder.shippingAddress as any)?.shipping?.street1 || ""} ${(currentOrder.shippingAddress as any)?.shipping?.city || ""
        }, ${(currentOrder.shippingAddress as any)?.shipping?.state || ""} ${(currentOrder.shippingAddress as any)?.shipping?.zipCode || ""
        }`,
        pageWidth / 2,
        infoStartY + 25,
        { maxWidth: pageWidth / 2 - margin }
      );

      doc.line(margin, infoStartY + 35, pageWidth - margin, infoStartY + 35);

      const tableStartY = infoStartY + 45;
      const tableHead = [["Description", "Size", "Qty", "Price/Unit", "Total"]];
      const tableBody = [];

      currentOrder.items.forEach((item) => {
        item.sizes.forEach((size, sizeIndex) => {
          const sizeValueUnit = `${size.size_value} ${size.size_unit}`;
          const quantity = size.quantity.toString();
          const pricePerUnit = `${Number(size.price).toFixed(2)}`;
          const totalPerSize = `${(size.quantity * size.price).toFixed(2)}`;

          tableBody.push([item.name, sizeValueUnit, quantity, pricePerUnit, totalPerSize]);

          if (sizeIndex === 0 && item.description && item.description.trim()) {
            tableBody.push([
              {
                content: item.description.trim(),
                styles: { fontStyle: "italic", textColor: [80, 80, 80] },
              },
              "",
              "",
              "",
              "",
            ]);
          }
        });
      });

      (doc as any).autoTable({
        head: tableHead,
        body: tableBody,
        startY: tableStartY,
        styles: { fontSize: 9 },
        theme: "grid",
        headStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: "bold" },
        columnStyles: {
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
        },
        margin: { left: margin },
        tableWidth: "auto",
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;

      const subtotal = currentOrder.items.reduce((sum, item) => {
        return sum + item.sizes.reduce((sizeSum, size) => sizeSum + size.quantity * size.price, 0);
      }, 0);
      const handling = Number(currentOrder?.po_handling_charges || 0);
      const fred = Number(currentOrder?.po_fred_charges || 0);
      const shipping = Number(currentOrder?.shipping_cost || 0);
      const tax = Number(currentOrder?.tax_amount || 0);
      const total = subtotal + handling + fred + shipping + tax;

      const summaryBody = [
        ["Sub Total", `${subtotal.toFixed(2)}`],
        ["Handling-Shipping", `${handling.toFixed(2)}`],
        ["Tax", `${fred.toFixed(2)}`],
        ["Total", `${total.toFixed(2)}`],
      ];

      (doc as any).autoTable({
        body: summaryBody,
        startY: finalY,
        theme: "grid",
        styles: { fontSize: 10 },
        headStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: "bold" },
        columnStyles: {
          0: { halign: "left", fontStyle: "bold" },
          1: { halign: "right" },
        },
        margin: { left: pageWidth - margin - 65 },
        tableWidth: 60,
      });

      doc.save(`${currentOrder.order_number}.pdf`);

      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      });
    } catch (error) {
      console.error("PDF Error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const updateSizeQuantities = async (orderItems, isApprove = true) => {
    for (const item of orderItems) {
      if (item.sizes && item.sizes.length > 0) {
        for (const size of item.sizes) {
          const { data: currentSize, error: fetchError } = await supabase
            .from("product_sizes")
            .select("stock")
            .eq("id", size.id)
            .single();

          if (fetchError || !currentSize) {
            console.warn(`Size not found in Supabase for ID: ${size.id}, skipping...`);
            continue;
          }

          const newQuantity = isApprove
            ? currentSize.stock + size.quantity
            : currentSize.stock - size.quantity;

          const { error: updateError } = await supabase
            .from("product_sizes")
            .update({ stock: newQuantity })
            .eq("id", size.id);

          if (updateError) {
            console.error(`Failed to update stock for size ID: ${size.id}`, updateError);
            throw new Error("Failed to update size quantity");
          }
        }
      }
    }
  };

  const handleApprove = async () => {
    setChargesOpen(true);
  };

  const submitCharges = async (handling, fred) => {
    try {
      Swal.fire({
        title: "Approving Order...",
        text: "Please wait while we update the stock.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading(),
      });

      await updateSizeQuantities(order.items, true);

      await supabase
        .from("orders")
        .update({
          poApproved: true,
          po_handling_charges: handling,
          po_fred_charges: fred,
        })
        .eq("id", order.id);

      onOpenChange(false);
      Swal.close();

      Swal.fire({
        title: "Order Approved ✅",
        icon: "success",
      }).then(() => window.location.reload());
    } catch (error) {
      Swal.close();
      Swal.fire({
        title: "Error",
        text: "Approval failed",
        icon: "error",
      });
    }
  };

  const handleReject = async () => {
    try {
      Swal.fire({
        title: "Rejecting Order...",
        text: "Please wait while we update the stock.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
        background: "#f9fafb",
        customClass: {
          popup: "z-[99999] rounded-xl shadow-lg",
          title: "text-lg font-semibold",
        },
      });

      await updateSizeQuantities(order.items, false);
      await supabase
        .from("orders")
        .update({
          poApproved: false,
          po_handling_charges: 0,
          po_fred_charges: 0,
        })
        .eq("id", order.id);

      onOpenChange(false);
      Swal.close();

      Swal.fire({
        title: "Order Rejected ❌",
        text: "Stock has been reduced successfully!",
        icon: "warning",
        confirmButtonText: "OK",
        confirmButtonColor: "#f59e0b",
        background: "#fff7ed",
        color: "#78350f",
        customClass: {
          popup: "z-[99999] rounded-xl shadow-lg",
        },
      }).then(() => {
        window.location.reload();
      });
    } catch (error) {
      Swal.close();
      Swal.fire({
        title: "Error",
        text: "Something went wrong while rejecting the order.",
        icon: "error",
        confirmButtonText: "OK",
        confirmButtonColor: "#ef4444",
        customClass: {
          popup: "z-[99999] rounded-xl shadow-lg",
        },
      });
    }
  };


    const handleDownloadPackingSlip = () => {
    // Open modal instead of directly downloading
    setIsPackingSlipModalOpen(true);
  };


  if (!currentOrder) return null;

  return (
    <>


      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full max-w-full md:max-w-4xl overflow-y-auto z-50 p-4 md:p-6">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-lg md:text-xl">Order Details</SheetTitle>
            <SheetDescription className="text-sm md:text-base">
              {isEditing ? "Edit order details" : "View and manage order information"}
            </SheetDescription>
          </SheetHeader>

          {isEditing ? (
            <div className="mt-6">
              <CreateOrderForm initialData={currentOrder} isEditing={isEditing} />
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                className="mt-4 w-full md:w-auto"
              >
                Cancel Edit
              </Button>
            </div>
          ) : (
            <>
              {/* Order Header */}
              <OrderHeader
                order={currentOrder}
                onEdit={() => setIsEditing(true)}
                onDownload={handleDownloadPDF}
                onDelete={onDeleteOrder ? () => onDeleteOrder(currentOrder.id) : undefined}
                isGeneratingPDF={isGeneratingPDF}
                userRole={userRole}
                poIs={poIs}
              />

              {/* Tabs */}
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 mb-4">
                  <TabsTrigger value="overview" className="text-xs md:text-sm">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="items" className="text-xs md:text-sm">
                    Items
                  </TabsTrigger>
                  <TabsTrigger value="customer" className="text-xs md:text-sm">
                    {poIs ? "Vendor" : "Customer"}
                  </TabsTrigger>
                  <TabsTrigger value="payment" className="text-xs md:text-sm">
                    Payment
                  </TabsTrigger>
                  <TabsTrigger value="shipping" className="text-xs md:text-sm">
                    Shipping
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="text-xs md:text-sm">
                    Activity
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-0">
                  <OverviewTab order={currentOrder} companyName={companyName} poIs={poIs} />
                </TabsContent>

                <TabsContent value="items" className="mt-0">
                  <ItemsTab
                    items={currentOrder.items}
                    onEdit={() => setIsEditing(true)}
                    userRole={userRole}
                    orderStatus={currentOrder.status}
                    isVoid={currentOrder.void}
                  />
                </TabsContent>

                <TabsContent value="customer" className="mt-0">
                  <CustomerTab
                    customerInfo={currentOrder.customerInfo}
                    shippingAddress={currentOrder.shippingAddress}
                    companyName={companyName}
                    poIs={poIs}
                    onEdit={() => setIsEditing(true)}
                    userRole={userRole}
                    orderStatus={currentOrder.status}
                    isVoid={currentOrder.void}
                  />
                </TabsContent>

                <TabsContent value="payment" className="mt-0">
                  <PaymentTab
                    order={currentOrder}
                    onSendPaymentLink={sendMail}
                    isSendingLink={loading}
                    poIs={poIs}
                  />
                </TabsContent>

                <TabsContent value="shipping" className="mt-0">
                  <ShippingTab
                    order={currentOrder}
                    onEdit={() => setIsEditing(true)}
                    userRole={userRole}
                  />
                </TabsContent>

                <TabsContent value="activity" className="mt-0">
                  <ActivityTab order={currentOrder} />
                </TabsContent>
              </Tabs>

              {/* Admin Actions */}
              {userRole === "admin" && !poIs && (
                <div className="flex justify-end mt-6 pt-4 border-t">

                  <button
                  onClick={handleDownloadPackingSlip}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow hover:shadow-lg transition duration-300"
                >
                  <Package size={18} />
                  Packing Slip
                </button>
                  <OrderActions
                    order={currentOrder}
                    onProcessOrder={() => handleStatusUpdate("process")}
                    onShipOrder={() => handleStatusUpdate("ship")}
                    onConfirmOrder={() => handleStatusUpdate("confirm")}
                    onDeleteOrder={onDeleteOrder}
                  />
                </div>
              )}

              {/* PO Actions */}
              {poIs && (
                <div className="flex w-full justify-end mt-6 gap-3 pt-4 border-t">
                  {order?.poApproved ? (
                    <Button onClick={handleReject} variant="destructive" className="gap-2">
                      <XCircle size={18} />
                      Reject Purchase
                    </Button>
                  ) : (
                    <Button onClick={handleApprove} className="gap-2 bg-green-600 hover:bg-green-700">
                      <CheckCircle size={18} />
                      Approve Purchase
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          <ChargesDialog open={chargesOpen} onOpenChange={setChargesOpen} onSubmit={submitCharges} />
        </SheetContent>


      </Sheet>

      <PackingSlipModal
        open={isPackingSlipModalOpen}
        onOpenChange={setIsPackingSlipModalOpen}
        orderData={currentOrder}
      />
    </>
  );
};
