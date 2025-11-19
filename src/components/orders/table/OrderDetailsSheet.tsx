import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Edit, CreditCard, Download, LoaderCircle, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateOrderForm } from "../CreateOrderForm";
import { OrderFormValues } from "../schemas/orderSchema";
import { OrderCustomerInfo } from "../details/OrderCustomerInfo";
import { OrderItemsList } from "../details/OrderItemsList";
import { OrderPaymentInfo } from "../details/OrderPaymentInfo";
import { OrderWorkflowStatus } from "../workflow/OrderWorkflowStatus";
import { OrderActions } from "./OrderActions";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { processACHPayment } from "../utils/authorizeNetUtils";
import { supabase } from "@/supabaseClient";
import PaymentForm from "@/components/PaymentModal";
import axios from "../../../../axiosconfig";
import { Link } from "react-router-dom";

import { useCart } from "@/hooks/use-cart";
import jsPDF from "jspdf";
import { current } from "@reduxjs/toolkit";
import JsBarcode from "jsbarcode"
import Swal from "sweetalert2";
import { ChargesDialog } from "./ChargesDialog";

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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const { toast } = useToast();
  const [currentOrder, setCurrentOrder] = useState<OrderFormValues>(order);
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [loading, setLoading] = useState(false);

  // Update currentOrder when order prop changes
  useEffect(() => {
    setCurrentOrder(order);
    console.log(order, "ORDERED")
  }, [order]);

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
  const [loadingQuick, setLoadingQuick] = useState(false);
  const [componyName, setComponyName] = useState("");

  const sendMail = async () => {
    setLoading(true);
    try {
      await axios.post("/paynow-user", order);
      console.log("Order status sent successfully to backend.");
      toast({
        title: "Payment Link sent successfully",
        description: "",
        variant: "default",
      });
    } catch (apiError) {
      console.error("Failed to send order status to backend:", apiError);
    }
    setLoading(false);
  };

  const fetchUser = async () => {
    try {
      if (!currentOrder || !currentOrder.customer) return;

      const userID = currentOrder.customer;

      const { data, error } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("id", userID)
        .maybeSingle();

      if (error) {
        console.error("🚨 Supabase Fetch Error:", error);
        return;
      }

      if (!data) {
        console.warn("⚠️ No user found for this email.");
        return;
      }

      console.log("✅ User Data:", data);
      setComponyName(data.company_name || "");
    } catch (error) { }
  };

  useEffect(() => {
    fetchUser();
  }, [currentOrder]);

  const { clearCart } = useCart();

  useEffect(() => {
    console.log(isEditing);

    const clearCartIfEditing = async () => {
      if (isEditing) {
        console.log("object");
        await clearCart();
      }
    };

    clearCartIfEditing();
  }, [isEditing]);

  console.log(currentOrder);

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
      } else {
        console.log("Order data:", data);
        const quickBook = await axios.post("/invoice-quickbook", data);

        if (quickBook?.status === 200) {
          const invoiceId = quickBook?.data?.data?.Invoice?.Id;
          console.log("QuickBooks Invoice ID:", invoiceId);

          const { error: updateError } = await supabase
            .from("orders")
            .update({ quickBooksID: invoiceId }) // Make sure column name matches
            .eq("id", currentOrder.id);

          if (updateError) {
            console.error(
              "Error updating order with QuickBooks ID:",
              updateError
            );
          } else {
            console.log("Order updated with QuickBooks ID successfully.");
            await loadOrders(poIs);
            const updatedData = {
              ...currentOrder,
              quickBooksID: invoiceId, // ya jis variable me ID hai
            };

            setCurrentOrder(updatedData);
          }
        }
      }
    } catch (error) {
      console.error("Error in quickBookUpdate:", error);
    } finally {
      setLoadingQuick(false);
    }
  };

  const formattedDate = new Date(currentOrder.date).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    }
  );

  // This is a proposed modification based on the analysis.
  // It assumes currentOrder object contains the necessary data fields.
  const generateBarcode = (text: string): string => {
    const canvas = document.createElement("canvas")
    JsBarcode(canvas, text, {
      format: "CODE128",
      width: 2,
      height: 40,
      displayValue: false,
      margin: 0,
    })
    return canvas.toDataURL("image/png")
  }




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
      const contentWidth = pageWidth - margin * 2;

      // Add Logo (Left side)
      const logo = new Image();
      logo.src = "/final.png";
      await new Promise((resolve) => (logo.onload = resolve));
      const logoHeight = 23;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      // Logo (center aligned)
      doc.addImage(logo, "PNG", pageWidth / 2 - logoWidth / 2, margin, logoWidth, logoHeight);

      // Set Fonts
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      // Top Info Line (All in one row, top line)
      const topInfo = [
        "Tax ID : 99-0540972",
        "936 Broad River Ln, Charlotte, NC 28211",
        "info@9rx.com",
        "www.9rx.com"
      ].join("     |     ");
      doc.text(topInfo, pageWidth / 2, margin - 2, { align: "center" });

      // Centered Phone Number (under logo)
      // Phone number (left aligned, vertically center of logo)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("+1 800 969 6295", margin, margin + 10);

      // PURCHASE ORDER TITLE (right side)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("PURCHASE ORDER", pageWidth - margin - 5, margin + 10, { align: "right" });

      doc.setFontSize(10);
      doc.text(`ORDER - ${currentOrder.order_number}`, pageWidth - margin - 5, margin + 15, { align: "right" });
      doc.text(`Date - ${formattedDate}`, pageWidth - margin - 5, margin + 20, { align: "right" });

      // Divider line
      doc.setDrawColor(200);
      doc.line(margin, margin + 26, pageWidth - margin, margin + 26);

      // Addresses
      const infoStartY = margin + 35;
      doc.setFont("helvetica", "bold").setFontSize(11).text("Vendor", margin, infoStartY);
      doc.setFont("helvetica", "normal").setFontSize(9);
      doc.text(componyName, margin, infoStartY + 5);
      doc.text(currentOrder.customerInfo?.name || "N/A", margin, infoStartY + 10);
      doc.text(currentOrder.customerInfo?.phone || "N/A", margin, infoStartY + 15);
      doc.text(currentOrder.customerInfo?.email || "N/A", margin, infoStartY + 20);
      doc.text(
        `${currentOrder.customerInfo?.address?.street || ""} ${currentOrder.customerInfo?.address?.city || ""}, ${currentOrder.customerInfo?.address?.state || ""} ${currentOrder.customerInfo?.address?.zip_code || ""}`,
        margin,
        infoStartY + 25,
        { maxWidth: contentWidth / 2 }
      );

      doc.setFont("helvetica", "bold").setFontSize(11).text("Ship To", pageWidth / 2, infoStartY);
      doc.setFont("helvetica", "normal").setFontSize(9);
      doc.text("9RX", pageWidth / 2, infoStartY + 5);
      doc.text(currentOrder.shippingAddress?.fullName || "N/A", pageWidth / 2, infoStartY + 10);
      doc.text(currentOrder.shippingAddress?.phone || "N/A", pageWidth / 2, infoStartY + 15);
      doc.text(currentOrder.shippingAddress?.email || "N/A", pageWidth / 2, infoStartY + 20);
      doc.text(
        `${currentOrder.shippingAddress?.address?.street || ""} ${currentOrder.shippingAddress?.address?.city || ""}, ${currentOrder.shippingAddress?.address?.state || ""} ${currentOrder.shippingAddress?.address?.zip_code || ""}`,
        pageWidth / 2,
        infoStartY + 25,
        { maxWidth: contentWidth / 2 }
      );

      doc.line(margin, infoStartY + 35, pageWidth - margin, infoStartY + 35);

      // Items Table
      // Items Table
      const tableStartY = infoStartY + 45;
      const tableHead = [["Description", "Size", "Qty", "Price/Unit", "Total"]];

      const tableBody = [];

      currentOrder.items.forEach((item) => {
        item.sizes.forEach((size, sizeIndex) => {
          const sizeValueUnit = `${size.size_value} ${size.size_unit}`;
          const quantity = size.quantity.toString();
          const pricePerUnit = `$${Number(size.price).toFixed(2)}`;
          const totalPerSize = `$${(size.quantity * size.price).toFixed(2)}`;

          // First row: product name in Description column
          tableBody.push([
            item.name, // product name
            sizeValueUnit,
            quantity,
            pricePerUnit,
            totalPerSize
          ]);

          // Only add description row for the first size
          if (sizeIndex === 0 && item.description && item.description.trim()) {
            tableBody.push([
              { content: item.description.trim(), styles: { fontStyle: 'italic', textColor: [80, 80, 80] } },
              "", "", "", "" // empty for other columns
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
        tableWidth: 'auto',
      });


      const finalY = (doc as any).lastAutoTable.finalY + 10;

      // Summary Calculations
      const subtotal = currentOrder.items.reduce((sum, item) => {
        return sum + item.sizes.reduce((sizeSum, size) => sizeSum + (size.quantity * size.price), 0);
      }, 0);
      const handling = Number(currentOrder?.po_handling_charges || 0);
      const fred = Number(currentOrder?.po_fred_charges || 0);
      const shipping = Number(currentOrder?.shipping_cost || 0);
      const tax = Number(currentOrder?.tax_amount || 0);
      const total = subtotal + handling + fred + shipping + tax;


      const summaryBody = [
        ['Sub Total', `$${subtotal.toFixed(2)}`],
        ['Handling-Shipping', `$${handling.toFixed(2)}`],
        ['Tax', `$${fred.toFixed(2)}`],
        ['Total', `$${total.toFixed(2)}`],
      ];

      (doc as any).autoTable({

        body: summaryBody,
        startY: finalY,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold' },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold' },
          1: { halign: 'right' },
        },
        margin: { left: pageWidth - margin - 65 },
        tableWidth: 60,
      });

      // Save PDF
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
          // Fetch current stock for this size
          const { data: currentSize, error: fetchError } = await supabase
            .from("product_sizes")
            .select("stock")
            .eq("id", size.id)
            .single();

          if (fetchError || !currentSize) {
            console.warn(`⚠️ Size not found in Supabase for ID: ${size.id}, skipping...`);
            continue;
          }

          const newQuantity = isApprove
            ? currentSize.stock + size.quantity
            : currentSize.stock - size.quantity;

          // Update stock
          const { error: updateError } = await supabase
            .from("product_sizes")
            .update({ stock: newQuantity })
            .eq("id", size.id);

          if (updateError) {
            console.error(`❌ Failed to update stock for size ID: ${size.id}`, updateError);
            throw new Error("Failed to update size quantity");
          } else {
            console.log(`✅ Updated stock for size ID: ${size.id}`);
          }
        }
      }
    }
  };


  const [chargesOpen, setChargesOpen] = useState(false);

  const handleApprove = async () => {
    setChargesOpen(true);
  };


  const submitCharges = async (handling, fred) => {
    try {
      Swal.fire({
        title: 'Approving Order...',
        text: 'Please wait while we update the stock.',
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
        title: 'Order Approved ✅',
        icon: 'success',
      }).then(() => window.location.reload());
    } catch (error) {
      Swal.close();
      Swal.fire({
        title: 'Error',
        text: 'Approval failed',
        icon: 'error',
      });
    }
  };



  const handleReject = async () => {
    try {
      Swal.fire({
        title: 'Rejecting Order...',
        text: 'Please wait while we update the stock.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
        background: '#f9fafb',
        customClass: {
          popup: 'z-[99999] rounded-xl shadow-lg',
          title: 'text-lg font-semibold',
        },
      });

      await updateSizeQuantities(order.items, false);
      await supabase
        .from("orders")
        .update({
          poApproved: false,
          po_handling_charges: 0,  // ✅ set to 0
          po_fred_charges: 0,      // ✅ set to 0
        })
        .eq("id", order.id);

      onOpenChange(false);
      Swal.close();

      Swal.fire({
        title: 'Order Rejected ❌',
        text: 'Stock has been reduced successfully!',
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#f59e0b',
        background: '#fff7ed',
        color: '#78350f',
        customClass: {
          popup: 'z-[99999] rounded-xl shadow-lg',
        },
      }).then(() => {
        window.location.reload();
      });
    } catch (error) {
      Swal.close();
      Swal.fire({
        title: 'Error',
        text: 'Something went wrong while rejecting the order.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#ef4444',
        customClass: {
          popup: 'z-[99999] rounded-xl shadow-lg',
        },
      });
    }
  };






  if (!currentOrder) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-full md:max-w-3xl overflow-y-auto z-50 p-4 md:p-6">
        <SheetHeader>
          <SheetTitle className="text-lg md:text-xl">Order Details</SheetTitle>
          <SheetDescription className="text-sm md:text-base">
            {isEditing ? "Edit order details" : "View order details"}
          </SheetDescription>
        </SheetHeader>

        {false && !currentOrder?.quickBooksID && (
          <div className="w-full flex justify-end items-end flex-1">
            <Button
              variant="outline"
              onClick={quickBookUpdate}
              disabled={loadingQuick}
              className={`
        px-5 py-2 rounded-3xl font-semibold transition-all duration-300 
        flex items-center gap-2 
        ${loadingQuick
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
                } 
        text-white
      `}
            >
              {loadingQuick ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                "QUICK BOOKS UPDATE"
              )}
            </Button>
          </div>
        )}

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
          <div className="mt-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              {!poIs && (
                <h3 className="text-base md:text-lg font-semibold">
                  Order Status
                </h3>
              )}
              <span className="text-sm md:text-base">
                Order Number: {currentOrder.order_number}
              </span>
              {userRole === "admin" && currentOrder.status !== "cancelled" && !currentOrder.void && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                  className="w-full md:w-auto"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Order
                </Button>
              )}
            </div>

            {!poIs && <OrderWorkflowStatus status={currentOrder.status} />}

            {currentOrder.payment_status !== "paid" && !poIs && (
              <div>
                <div className="flex gap-3 justify-center items-center min-w-full">
                  <Link
                    to={`/pay-now?orderid=${currentOrder.id}`}
                    className="px-4 py-2 bg-red-600 text-white font-semibold text-sm md:text-base rounded-lg hover:bg-red-700 transition duration-300"
                  >
                    Create Payment Link
                  </Link>
                  <button
                    onClick={sendMail}
                    disabled={loading}
                    className={`px-4 py-2 font-semibold text-sm md:text-base rounded-lg transition duration-300 ${loading
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                  >
                    {loading ? "Sending..." : "Send Payment Link"}
                  </button>
                </div>

                <div className="flex w-full mt-2 justify-center">
                  <span className="text-red-700 font-semibold text-sm md:text-base bg-red-200 px-3 py-1 rounded-md">
                    Unpaid
                  </span>
                </div>
              </div>
            )}

            {userRole === "admin" && !poIs && (
              <div className="flex justify-end">
                <OrderActions
                  order={currentOrder}
                  onProcessOrder={() => handleStatusUpdate("process")}
                  onShipOrder={() => handleStatusUpdate("ship")}
                  onConfirmOrder={() => handleStatusUpdate("confirm")}
                  onDeleteOrder={onDeleteOrder}
                />
              </div>
            )}

            <OrderCustomerInfo
              customerInfo={currentOrder.customerInfo}
              shippingAddress={currentOrder.shippingAddress}
              componyName={componyName}
              poIs={poIs}
            />


            <OrderItemsList items={currentOrder.items} />
            <OrderPaymentInfo
              payment={currentOrder.payment}
              specialInstructions={currentOrder.specialInstructions}
            />

            {currentOrder?.specialInstructions && (
              <div className="mt-2">
                <p className="font-medium text-gray-700">
                  {poIs ? "Notes" : "Special Instructions"}:{" "} 
                  <span className="font-normal text-gray-600">
                    {currentOrder.specialInstructions}
                  </span>
                </p>
              </div>
            )}

          </div>
        )}

        {poIs && (
          <div className="flex w-full justify-end mt-6 gap-3">
            {/* Download PDF */}
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow hover:shadow-lg transition duration-300"
            >
              <Download size={18} />
              Download PDF
            </button>

            {/* Approve / Reject Buttons */}
            {order?.poApproved ? (
              <button
                onClick={handleReject}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg shadow hover:shadow-lg transition duration-300"
              >
                <XCircle size={18} className="text-white" />
                Reject Purchase
              </button>
            ) : (
              <button
                onClick={handleApprove}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg shadow hover:shadow-lg transition duration-300"
              >
                <CheckCircle size={18} className="text-white" />
                Approve Purchase
              </button>
            )}

          </div>
        )}


        <ChargesDialog
          open={chargesOpen}
          onOpenChange={setChargesOpen}
          onSubmit={submitCharges}
        />


      </SheetContent>
    </Sheet>
  );
};
