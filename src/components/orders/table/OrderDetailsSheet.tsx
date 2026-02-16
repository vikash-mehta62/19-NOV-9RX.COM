import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateOrderForm } from "../CreateOrderForm";
import { OrderFormValues, ShippingAddressData } from "../schemas/orderSchema";
import { OrderHeader } from "../details/OrderHeader";
import { OverviewTab } from "../details/tabs/OverviewTab";
import { ItemsTab } from "../details/tabs/ItemsTab";
import { CustomerTab } from "../details/tabs/CustomerTab";
import { PaymentTab } from "../details/tabs/PaymentTab";
import { ShippingTab } from "../details/tabs/ShippingTab";
import { ActivityTab } from "../details/tabs/ActivityTab";
import { OrderActions } from "./OrderActions";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import axios from "../../../../axiosconfig";
import { useCart } from "@/hooks/use-cart";
import jsPDF from "jspdf";
import "jspdf-autotable";
import JsBarcode from "jsbarcode";
import Swal from "sweetalert2";
import { ChargesDialog } from "./ChargesDialog";
import { PackingSlipModal } from "../PackingSlipModal";
import { PharmacyOrderDetails } from "@/components/pharmacy/PharmacyOrderDetails";
import Logo from "../../../assests/home/9rx_logo.png";
import { OrderActivityService } from "@/services/orderActivityService";

// Helper function to safely get address fields
const getAddressField = (
  shippingAddress: ShippingAddressData | undefined,
  type: "billing" | "shipping",
  field: keyof ShippingAddressData["billing"]
): string => {
  if (!shippingAddress) return "";
  const addressObj = shippingAddress[type];
  if (!addressObj) return "";
  return (addressObj as Record<string, string>)[field] || "";
};

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
  poIs: poIsProp = false, // Renamed to avoid confusion
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
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [chargesOpen, setChargesOpen] = useState(false);
  const [isPackingSlipModalOpen, setIsPackingSlipModalOpen] = useState(false);
  const [paidAmount, setPaidAmount] = useState(0);

  // Ref to track if component is mounted (prevents memory leaks)
  const isMountedRef = useRef(true);

  // Update currentOrder when order prop changes
  useEffect(() => {
    console.log("🔄 OrderDetailsSheet - Order changed:", {
      orderId: order.id,
      orderNumber: order.order_number,
      poAccept: (order as any)?.poAccept
    });
    setCurrentOrder(order);
  }, [order]);

  // Determine if this is a PO from the order data itself (more reliable than prop)
  // poAccept: false means it's a Purchase Order
  // poAccept: true or undefined means it's a Sales Order
  // Use useMemo to recalculate when currentOrder changes
  const poIs = useMemo(() => {
    const isPO = (currentOrder as any)?.poAccept === false;
    console.log("🔍 OrderDetailsSheet - Calculating poIs:", {
      orderId: currentOrder.id,
      orderNumber: currentOrder.order_number,
      poAccept: (currentOrder as any)?.poAccept,
      isPO
    });
    return isPO;
  }, [currentOrder]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch company name with proper cleanup
  const fetchUser = useCallback(async () => {
    if (!currentOrder?.customer) return;

    setIsLoadingCompany(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("id", currentOrder.customer)
        .maybeSingle();

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      if (error) {
        console.error("Supabase Fetch Error:", error);
        return;
      }

      if (data) {
        setCompanyName(data.company_name || "");
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error("Error fetching user:", error);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoadingCompany(false);
      }
    }
  }, [currentOrder?.customer]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Fetch paid amount from order
  const fetchPaidAmount = useCallback(async () => {
    if (!currentOrder?.id) return;
    try {
      const orderRes = await supabase
        .from("orders")
        .select("paid_amount, total_amount, payment_status")
        .eq("id", currentOrder.id)
        .maybeSingle();
      const orderData = orderRes.data as { paid_amount?: number; total_amount?: number; payment_status?: string } | null;

      if (!isMountedRef.current) return;

      let amount = Number(orderData?.paid_amount || 0);
      if (amount === 0 && orderData?.payment_status === 'paid') {
        amount = Number(orderData?.total_amount || 0);
      }
      setPaidAmount(amount);
    } catch (error) {
      console.error("Error fetching paid amount:", error);
    }
  }, [currentOrder?.id]);

  useEffect(() => {
    fetchPaidAmount();
  }, [fetchPaidAmount]);

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

    // Prevent multiple clicks
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);

    try {
      switch (action) {
        case "process":
          if (onProcessOrder) {
            await onProcessOrder(currentOrder.id);
            if (isMountedRef.current) {
              setCurrentOrder((prev) => ({ ...prev, status: "processing" }));
            }
          }
          break;
        case "ship":
          if (onShipOrder) {
            await onShipOrder(currentOrder.id);
            if (isMountedRef.current) {
              setCurrentOrder((prev) => ({ ...prev, status: "shipped" }));
            }
          }
          break;
        case "confirm":
          if (onConfirmOrder) {
            await onConfirmOrder(currentOrder.id);
            if (isMountedRef.current) {
              setCurrentOrder((prev) => ({ ...prev, status: "processing" }));
            }
          }
          break;
      }
    } catch (error) {
      console.error(`Error updating order status:`, error);
      if (isMountedRef.current) {
        toast({
          title: "Error",
          description: "Failed to update order status",
          variant: "destructive",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setIsUpdatingStatus(false);
      }
    }
  };

  const sendMail = async () => {
    setLoading(true);
    try {
      // Fetch fresh order data from database to ensure accurate information
      const freshRes = await supabase
        .from("orders")
        .select("*")
        .eq("id", currentOrder.id)
        .single();

      const freshOrder = freshRes.data as any;
      if (freshRes.error) throw freshRes.error;

      // Prepare order data with all required fields for email template
      const orderData = {
        id: freshOrder.id,
        order_number: freshOrder.order_number,
        customerInfo: freshOrder.customerInfo,
        items: freshOrder.items,
        total: freshOrder.total_amount,
        total_amount: freshOrder.total_amount,
        tax_amount: freshOrder.tax_amount || 0,
        shipping_cost: freshOrder.shipping_cost || 0,
        paid_amount: freshOrder.paid_amount || 0,
        date: freshOrder.date || freshOrder.created_at,
        status: freshOrder.status,
        payment_status: freshOrder.payment_status,
      };

      await axios.post("/paynow-user", orderData);
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
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      // Brand color
      const brandColor: [number, number, number] = [59, 130, 246]; // Blue color
      const darkGray: [number, number, number] = [60, 60, 60];
      const lightGray: [number, number, number] = [245, 245, 245];

      // ===== HEADER BAND =====
      doc.setFillColor(...brandColor);
      doc.rect(0, 0, pageWidth, 5, "F");

      // ===== LOGO SECTION =====
      let logoLoaded = false;
      try {
        const logo = new Image();
        logo.src = Logo
        await new Promise<void>((resolve) => {
          logo.onload = () => { logoLoaded = true; resolve(); };
          logo.onerror = () => resolve();
          setTimeout(() => resolve(), 3000);
        });

        if (logoLoaded && logo.width > 0) {
          const logoHeight = 20;
          const logoWidth = (logo.width / logo.height) * logoHeight;
          doc.addImage(logo, "PNG", margin, 6, logoWidth, logoHeight);
        }
      } catch {
        // Continue without logo
      }

      // ===== COMPANY INFO (Left) =====
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...darkGray);
      doc.text("9RX LLC", margin, logoLoaded ? 32 : 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("936 Broad River Ln, Charlotte, NC 28211", margin, logoLoaded ? 38 : 22);
      doc.text("Phone: +1 800 969 6295  |  Email: info@9rx.com", margin, logoLoaded ? 43 : 27);
      doc.text("Tax ID: 99-0540972  |  www.9rx.com", margin, logoLoaded ? 48 : 32);

      // ===== DOCUMENT TITLE & NUMBER (Right) =====
      // Determine document type: PO, Sales Order (new), or Invoice (confirmed)
      const invoiceNumber = (currentOrder as any).invoice_number;
      const isNewOrder = currentOrder.status === "new" || currentOrder.status === "pending";

      let documentTitle: string;
      let documentNumber: string;

      if (poIs) {
        documentTitle = "PURCHASE ORDER";
        documentNumber = currentOrder.order_number;
      } else if (invoiceNumber && !isNewOrder) {
        documentTitle = "INVOICE";
        documentNumber = invoiceNumber;
      } else {
        documentTitle = "SALES ORDER";
        documentNumber = currentOrder.order_number;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(...brandColor);
      doc.text(documentTitle, pageWidth - margin, 16, { align: "right" });

      doc.setFontSize(10);
      doc.setTextColor(...darkGray);
      doc.text(`# ${documentNumber}`, pageWidth - margin, 24, { align: "right" });

      // Show SO reference on invoice
      if (invoiceNumber && !isNewOrder && !poIs) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`SO Ref: ${currentOrder.order_number}`, pageWidth - margin, 29, { align: "right" });
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${formattedDate}`, pageWidth - margin, invoiceNumber && !isNewOrder && !poIs ? 34 : 30, { align: "right" });

      // Payment status badge
      const badgeY = invoiceNumber && !isNewOrder && !poIs ? 39 : 34;
      if (currentOrder.payment_status === "paid") {
        doc.setFillColor(34, 197, 94); // Green
        doc.roundedRect(pageWidth - margin - 25, badgeY, 25, 8, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("PAID", pageWidth - margin - 12.5, badgeY + 5.5, { align: "center" });
      } else {
        doc.setFillColor(239, 68, 68); // Red
        doc.roundedRect(pageWidth - margin - 30, badgeY, 30, 8, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("UNPAID", pageWidth - margin - 15, badgeY + 5.5, { align: "center" });
      }

      // ===== BARCODE =====
      try {
        const barcodeDataUrl = generateBarcode(documentNumber);
        doc.addImage(barcodeDataUrl, "PNG", pageWidth - margin - 50, badgeY + 10, 50, 12);
      } catch {
        // Skip barcode if generation fails
      }

      // ===== DIVIDER LINE =====
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(margin, 58, pageWidth - margin, 58);

      // ===== BILL TO / SHIP TO SECTION =====
      const infoStartY = 63;
      const boxWidth = (pageWidth - margin * 3) / 2;

      // Helper to draw info box
      const drawInfoBox = (title: string, x: number, lines: string[]) => {
        // Box background
        doc.setFillColor(...lightGray);
        doc.roundedRect(x, infoStartY, boxWidth, 35, 2, 2, "F");

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...brandColor);
        doc.text(title, x + 5, infoStartY + 7);

        // Content
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...darkGray);
        let y = infoStartY + 14;
        lines.filter(Boolean).forEach((line, idx) => {
          if (idx < 5) { // Max 5 lines
            doc.text(line, x + 5, y, { maxWidth: boxWidth - 10 });
            y += 5;
          }
        });
      };

      if (poIs) {
        // PURCHASE ORDER: Vendor + Ship To 9RX
        const vendorLines = [
          companyName,
          currentOrder.customerInfo?.name,
          currentOrder.customerInfo?.phone,
          currentOrder.customerInfo?.email,
          [
            getAddressField(currentOrder.shippingAddress, "billing", "street1"),
            getAddressField(currentOrder.shippingAddress, "billing", "city"),
            getAddressField(currentOrder.shippingAddress, "billing", "state"),
            getAddressField(currentOrder.shippingAddress, "billing", "zipCode")
          ].filter(Boolean).join(", ")
        ].filter(Boolean);

        drawInfoBox("VENDOR", margin, vendorLines);
        drawInfoBox("SHIP TO", margin * 2 + boxWidth, [
          "9RX LLC",
          "936 Broad River Ln",
          "Charlotte, NC 28211",
          "+1 800 969 6295",
          "info@9rx.com"
        ]);
      } else {
        // INVOICE & SALES ORDER: Bill To + Ship To Customer
        console.log("🔍 PDF Debug - Order Data:", {
          shippingAddress: currentOrder.shippingAddress,
          customerInfo: currentOrder.customerInfo,
          companyName: companyName
        });

        console.log("🔍 PDF Debug - Full shippingAddress object:", JSON.stringify(currentOrder.shippingAddress, null, 2));

        // Extract billing address from customerInfo.address
        const billingAddr = currentOrder.customerInfo?.address || {};
        const billingStreet = billingAddr.street || "";
        const billingCity = billingAddr.city || "";
        const billingState = billingAddr.state || "";
        const billingZip = billingAddr.zip_code || "";

        // Extract shipping address from shippingAddress.address
        const shippingAddr = (currentOrder.shippingAddress as any)?.address || {};
        const shippingStreet = shippingAddr.street || "";
        const shippingCity = shippingAddr.city || "";
        const shippingState = shippingAddr.state || "";
        const shippingZip = shippingAddr.zip_code || "";

        console.log("🔍 PDF Debug - Extracted Fields:", {
          billing: { street: billingStreet, city: billingCity, state: billingState, zip: billingZip },
          shipping: { street: shippingStreet, city: shippingCity, state: shippingState, zip: shippingZip }
        });

        const billToLines = [
          companyName,
          currentOrder.customerInfo?.name,
          currentOrder.customerInfo?.phone,
          currentOrder.customerInfo?.email,
          billingStreet,
          [billingCity, billingState, billingZip].filter(Boolean).join(", ")
        ].filter(Boolean);

        const shipToLines = [
          (currentOrder.shippingAddress as any)?.fullName || companyName,
          currentOrder.customerInfo?.name,
          (currentOrder.shippingAddress as any)?.phone || currentOrder.customerInfo?.phone,
          shippingStreet,
          [shippingCity, shippingState, shippingZip].filter(Boolean).join(", ")
        ].filter(Boolean);

        console.log("🔍 PDF Debug - Final Lines:", {
          billToLines,
          shipToLines
        });

        drawInfoBox("BILL TO", margin, billToLines);
        drawInfoBox("SHIP TO", margin * 2 + boxWidth, shipToLines);
      }

      // ===== ITEMS TABLE =====
      // ===== ITEMS TABLE =====
      const tableStartY = infoStartY + 42;
      const tableHead = [["#", "Description", "Size", "Qty", "Unit Price", "Total"]];
      const tableBody: any[] = [];

      let itemIndex = 1;

      currentOrder.items.forEach((item: any) => {
        item.sizes.forEach((size: any, sizeIndex: number) => {
          const sizeValueUnit = `${size.size_value} ${size.size_unit}`;
          const quantity = size.quantity.toString();
          const pricePerUnit = `$${Number(size.price).toFixed(2)}`;
          const totalPerSize = `$${(size.quantity * size.price).toFixed(2)}`;

          // Main product row
          tableBody.push([
            itemIndex.toString(),
            item.name,
            sizeValueUnit,
            quantity,
            pricePerUnit,
            totalPerSize,
          ]);

          itemIndex++;

          if (
            sizeIndex === 0 &&
            item.description &&
            item.description.trim() &&
            !item.description.toLowerCase().includes("test")
          ) {
            tableBody.push([
              "",
              {
                content: `↳ ${item.description.trim()}`,
                styles: {
                  fontStyle: "italic",
                  textColor: [120, 120, 120],
                  fontSize: 8,
                },
              },
              "",
              "",
              "",
              "",
            ]);
          }
        });
      });

      // Draw table
      (doc as any).autoTable({
        head: tableHead,
        body: tableBody,
        startY: tableStartY,
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        theme: "striped",
        headStyles: {
          fillColor: brandColor,
          textColor: 255,
          fontStyle: "bold",
          halign: "center",
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { cellWidth: "auto" },
          2: { halign: "center", cellWidth: 25 },
          3: { halign: "center", cellWidth: 15 },
          4: { halign: "right", cellWidth: 25 },
          5: { halign: "right", cellWidth: 25 },
        },
        margin: { left: margin, right: margin, bottom: 30 },
        tableWidth: "auto",
        showHead: "everyPage",
        didDrawPage: () => {
          doc.setFillColor(...brandColor);
          doc.rect(0, 0, pageWidth, 5, "F");
          doc.rect(0, pageHeight - 2, pageWidth, 2, "F");
        },
      });


      const finalY = (doc as any).lastAutoTable.finalY + 8;

      // ===== SUMMARY SECTION =====
      const subtotal = currentOrder.items.reduce((sum, item: any) => {
        return sum + item.sizes.reduce((sizeSum, size) => sizeSum + size.quantity * size.price, 0);
      }, 0);
      // PO charges should ONLY be included for Purchase Orders, not Sales Orders
      const handling = poIs ? Number((currentOrder as any)?.po_handling_charges || 0) : 0;
      const fred = poIs ? Number((currentOrder as any)?.po_fred_charges || 0) : 0;
      const shipping = Number(currentOrder?.shipping_cost || 0);
      const tax = Number(currentOrder?.tax_amount || 0);
      const discountAmount = Number((currentOrder as any)?.discount_amount || 0);
      // Correct formula: Total = Subtotal + Shipping + Tax + PO Charges (if PO) - Discount
      const total = subtotal + handling + fred + shipping + tax - discountAmount;

      // Get discount details for display
      const discountDetails = (currentOrder as any)?.discount_details || [];
      const discountLabel = discountDetails.length > 0
        ? discountDetails.map((d: any) => d.name || "Discount").join(", ")
        : "Discount";

      const summaryBody: any[] = [
        ["Subtotal", `$${subtotal.toFixed(2)}`],
        ["Shipping & Handling", `$${(handling + shipping).toFixed(2)}`],
        ["Tax", `$${(fred + tax).toFixed(2)}`],
      ];

      // Add discount row if discount exists
      if (discountAmount > 0) {
        summaryBody.push([discountLabel, `-$${discountAmount.toFixed(2)}`]);
      }

      (doc as any).autoTable({
        body: summaryBody,
        startY: finalY,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { halign: "right", cellWidth: 45 },
          1: { halign: "right", cellWidth: 35, fontStyle: "normal" },
        },
        margin: { left: pageWidth - margin - 85 },
        tableWidth: 80,
      });

      // Total row with highlight
      const summaryFinalY = (doc as any).lastAutoTable.finalY;
      doc.setFillColor(...brandColor);
      doc.roundedRect(pageWidth - margin - 85, summaryFinalY + 2, 80, 10, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("TOTAL", pageWidth - margin - 80, summaryFinalY + 9);
      doc.text(`$${total.toFixed(2)}`, pageWidth - margin - 7, summaryFinalY + 9, { align: "right" });

      // Add Paid Amount and Balance Due
      let pdfPaidAmountY = summaryFinalY + 14;
      if (paidAmount > 0) {
        doc.setFillColor(34, 197, 94); // Green
        doc.roundedRect(pageWidth - margin - 85, pdfPaidAmountY, 80, 10, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text("PAID AMOUNT", pageWidth - margin - 80, pdfPaidAmountY + 7);
        doc.text(`$${paidAmount.toFixed(2)}`, pageWidth - margin - 7, pdfPaidAmountY + 7, { align: "right" });
        pdfPaidAmountY += 12;
      }

      const pdfBalanceDue = Math.abs(total - paidAmount) < 0.01 ? 0 : Math.max(0, total - paidAmount);
      if (pdfBalanceDue > 0) {
        doc.setFillColor(239, 68, 68); // Red
        doc.roundedRect(pageWidth - margin - 85, pdfPaidAmountY, 80, 10, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text("BALANCE DUE", pageWidth - margin - 80, pdfPaidAmountY + 7);
        doc.text(`$${pdfBalanceDue.toFixed(2)}`, pageWidth - margin - 7, pdfPaidAmountY + 7, { align: "right" });
      } else if (paidAmount > 0) {
        doc.setFillColor(34, 197, 94); // Green
        doc.roundedRect(pageWidth - margin - 85, pdfPaidAmountY, 80, 10, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text("FULLY PAID", pageWidth - margin - 45, pdfPaidAmountY + 7, { align: "center" });
        pdfPaidAmountY += 12;
      }

      // ===== FOOTER =====
      // Calculate footer position dynamically based on where summary ends
      // Use the higher of: 15mm after summary OR fixed position from bottom (for short orders)
      const summaryEndY = pdfPaidAmountY + 5; // Add some padding after last element
      const minFooterY = pageHeight - 25; // Minimum position from bottom
      const footerY = Math.max(summaryEndY + 10, minFooterY);

      // Check if footer would go off page, if so add new page
      if (footerY > pageHeight - 15) {
        // Don't draw footer on this page if it would overlap with page number area
        // The footer will only appear cleanly at the bottom
      } else {
        // Footer line
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

        // Thank you message
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...brandColor);
        doc.text("Thank you for your business!", pageWidth / 2, footerY + 2, { align: "center" });

        // Payment info - different for paid vs unpaid
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);

        if (currentOrder.payment_status === "paid") {
          // Show transaction ID for paid invoices
          const transactionId = (currentOrder as any).payment_transication || "";
          if (transactionId) {
            doc.text(`Transaction ID: ${transactionId}  |  Questions? Contact us at info@9rx.com`, pageWidth / 2, footerY + 8, { align: "center" });
          } else {
            doc.text("Payment Received  |  Questions? Contact us at info@9rx.com", pageWidth / 2, footerY + 8, { align: "center" });
          }
        } else {
          // Show payment terms for unpaid invoices
          doc.text("Payment Terms: Net 30  |  Questions? Contact us at info@9rx.com", pageWidth / 2, footerY + 8, { align: "center" });
        }
      }

      // Add page numbers to all pages (Page X of Y format)
      const totalPages = (doc as any).internal.getNumberOfPages();
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Ensure footer band is on this page
        doc.setFillColor(59, 130, 246);
        doc.rect(0, pdfHeight - 2, pdfWidth, 2, "F");

        // Draw white background for page number visibility
        doc.setFillColor(255, 255, 255);
        doc.rect(pdfWidth / 2 - 20, pdfHeight - 9, 40, 6, "F");

        // Draw page number text
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(`Page ${i} of ${totalPages}`, pdfWidth / 2, pdfHeight - 5, { align: "center" });
      }

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

  // Handle Print - Opens PDF in new window and triggers print dialog
  const handlePrint = async () => {
    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      // Brand color
      const brandColor: [number, number, number] = [59, 130, 246];
      const darkGray: [number, number, number] = [60, 60, 60];
      const lightGray: [number, number, number] = [245, 245, 245];

      // ===== HEADER BAND =====
      doc.setFillColor(...brandColor);
      doc.rect(0, 0, pageWidth, 5, "F");

      // ===== LOGO SECTION =====
      let logoLoaded = false;
      try {
        const logo = new Image();
        logo.src = Logo
        await new Promise<void>((resolve) => {
          logo.onload = () => { logoLoaded = true; resolve(); };
          logo.onerror = () => resolve();
          setTimeout(() => resolve(), 3000);
        });

        if (logoLoaded && logo.width > 0) {
          const logoHeight = 20;
          const logoWidth = (logo.width / logo.height) * logoHeight;
          doc.addImage(logo, "PNG", margin, 6, logoWidth, logoHeight);
        }
      } catch {
        // Continue without logo
      }

      // ===== COMPANY INFO (Left) =====
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...darkGray);
      doc.text("9RX LLC", margin, logoLoaded ? 32 : 16);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("936 Broad River Ln, Charlotte, NC 28211", margin, logoLoaded ? 38 : 22);
      doc.text("Phone: +1 800 969 6295  |  Email: info@9rx.com", margin, logoLoaded ? 43 : 27);
      doc.text("Tax ID: 99-0540972  |  www.9rx.com", margin, logoLoaded ? 48 : 32);

      // ===== DOCUMENT TITLE & NUMBER (Right) =====
      const invoiceNumber = (currentOrder as any).invoice_number;
      const isNewOrder = currentOrder.status === "new" || currentOrder.status === "pending";

      let documentTitle: string;
      let documentNumber: string;

      if (poIs) {
        documentTitle = "PURCHASE ORDER";
        documentNumber = currentOrder.order_number;
      } else if (invoiceNumber && !isNewOrder) {
        documentTitle = "INVOICE";
        documentNumber = invoiceNumber;
      } else {
        documentTitle = "SALES ORDER";
        documentNumber = currentOrder.order_number;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(...brandColor);
      doc.text(documentTitle, pageWidth - margin, 16, { align: "right" });

      doc.setFontSize(10);
      doc.setTextColor(...darkGray);
      doc.text(`# ${documentNumber}`, pageWidth - margin, 24, { align: "right" });

      if (invoiceNumber && !isNewOrder && !poIs) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`SO Ref: ${currentOrder.order_number}`, pageWidth - margin, 29, { align: "right" });
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${formattedDate}`, pageWidth - margin, invoiceNumber && !isNewOrder && !poIs ? 34 : 30, { align: "right" });

      // Payment status badge
      const badgeY = invoiceNumber && !isNewOrder && !poIs ? 39 : 34;
      if (currentOrder.payment_status === "paid") {
        doc.setFillColor(34, 197, 94);
        doc.roundedRect(pageWidth - margin - 25, badgeY, 25, 8, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("PAID", pageWidth - margin - 12.5, badgeY + 5.5, { align: "center" });
      } else {
        doc.setFillColor(239, 68, 68);
        doc.roundedRect(pageWidth - margin - 30, badgeY, 30, 8, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("UNPAID", pageWidth - margin - 15, badgeY + 5.5, { align: "center" });
      }

      // ===== BARCODE =====
      try {
        const barcodeDataUrl = generateBarcode(documentNumber);
        doc.addImage(barcodeDataUrl, "PNG", pageWidth - margin - 50, badgeY + 11, 50, 12);
      } catch {
        // Skip barcode if generation fails
      }

      // ===== DIVIDER LINE =====
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(margin, 58, pageWidth - margin, 58);

      // ===== BILL TO / SHIP TO SECTION =====
      const infoStartY = 63;
      const boxWidth = (pageWidth - margin * 3) / 2;

      const drawInfoBox = (title: string, x: number, lines: string[]) => {
        doc.setFillColor(...lightGray);
        doc.roundedRect(x, infoStartY, boxWidth, 35, 2, 2, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...brandColor);
        doc.text(title, x + 5, infoStartY + 7);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...darkGray);
        let y = infoStartY + 14;
        lines.filter(Boolean).forEach((line, idx) => {
          if (idx < 5) {
            doc.text(line, x + 5, y, { maxWidth: boxWidth - 10 });
            y += 5;
          }
        });
      };

      if (poIs) {
        const vendorLines = [
          companyName,
          currentOrder.customerInfo?.name,
          currentOrder.customerInfo?.phone,
          currentOrder.customerInfo?.email,
          [
            getAddressField(currentOrder.shippingAddress, "billing", "street1"),
            getAddressField(currentOrder.shippingAddress, "billing", "city"),
            getAddressField(currentOrder.shippingAddress, "billing", "state"),
            getAddressField(currentOrder.shippingAddress, "billing", "zipCode")
          ].filter(Boolean).join(", ")
        ].filter(Boolean);

        drawInfoBox("VENDOR", margin, vendorLines);
        drawInfoBox("SHIP TO", margin * 2 + boxWidth, [
          "9RX LLC",
          "936 Broad River Ln",
          "Charlotte, NC 28211",
          "+1 800 969 6295",
          "info@9rx.com"
        ]);
      } else {
        // INVOICE & SALES ORDER: Bill To + Ship To Customer
        // Extract billing address from customerInfo.address
        const billingAddr = currentOrder.customerInfo?.address || {};
        const billingStreet = billingAddr.street || "";
        const billingCity = billingAddr.city || "";
        const billingState = billingAddr.state || "";
        const billingZip = billingAddr.zip_code || "";

        // Extract shipping address from shippingAddress.address
        const shippingAddr = (currentOrder.shippingAddress as any)?.address || {};
        const shippingStreet = shippingAddr.street || "";
        const shippingCity = shippingAddr.city || "";
        const shippingState = shippingAddr.state || "";
        const shippingZip = shippingAddr.zip_code || "";

        const billToLines = [
          companyName,
          currentOrder.customerInfo?.name,
          currentOrder.customerInfo?.phone,
          currentOrder.customerInfo?.email,
          billingStreet,
          [billingCity, billingState, billingZip].filter(Boolean).join(", ")
        ].filter(Boolean);

        const shipToLines = [
          (currentOrder.shippingAddress as any)?.fullName || companyName,
          currentOrder.customerInfo?.name,
          (currentOrder.shippingAddress as any)?.phone || currentOrder.customerInfo?.phone,
          shippingStreet,
          [shippingCity, shippingState, shippingZip].filter(Boolean).join(", ")
        ].filter(Boolean);

        drawInfoBox("BILL TO", margin, billToLines);
        drawInfoBox("SHIP TO", margin * 2 + boxWidth, shipToLines);
      }

      // ===== ITEMS TABLE =====
      const tableStartY = infoStartY + 42;
      const tableHead = [["#", "Description", "Size", "Qty", "Unit Price", "Total"]];
      const tableBody: any[] = [];

      let itemIndex = 1;
      currentOrder.items.forEach((item: any) => {
        item.sizes.forEach((size, sizeIndex) => {
          const sizeValueUnit = `${size.size_value} ${size.size_unit}`;
          const quantity = size.quantity.toString();
          const pricePerUnit = `${Number(size.price).toFixed(2)}`;
          const totalPerSize = `${(size.quantity * size.price).toFixed(2)}`;

          tableBody.push([itemIndex.toString(), item.name, sizeValueUnit, quantity, pricePerUnit, totalPerSize]);
          itemIndex++;

          if (sizeIndex === 0 && item.description && item.description.trim()) {
            tableBody.push([
              "",
              {
                content: `↳ ${item.description.trim()}`,
                styles: { fontStyle: "italic", textColor: [120, 120, 120], fontSize: 8 },
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
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        theme: "striped",
        headStyles: {
          fillColor: brandColor,
          textColor: 255,
          fontStyle: "bold",
          halign: "center"
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250]
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { cellWidth: "auto" },
          2: { halign: "center", cellWidth: 25 },
          3: { halign: "center", cellWidth: 15 },
          4: { halign: "right", cellWidth: 25 },
          5: { halign: "right", cellWidth: 25 },
        },
        margin: { left: margin, right: margin, bottom: 30 },
        tableWidth: "auto",
        showHead: 'everyPage',
        didDrawPage: (data: any) => {
          // Add header band on every page
          doc.setFillColor(...brandColor);
          doc.rect(0, 0, pageWidth, 5, "F");
          // Add footer band on every page (at very bottom - thin 2mm bar)
          doc.setFillColor(...brandColor);
          doc.rect(0, pageHeight - 2, pageWidth, 2, "F");
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 8;

      // ===== SUMMARY SECTION =======
      const subtotal = currentOrder.items.reduce((sum, item: any) => {
        return sum + item.sizes.reduce((sizeSum, size) => sizeSum + size.quantity * size.price, 0);
      }, 0);
      // PO charges should ONLY be included for Purchase Orders, not Sales Orders
      const handling = poIs ? Number((currentOrder as any)?.po_handling_charges || 0) : 0;
      const fred = poIs ? Number((currentOrder as any)?.po_fred_charges || 0) : 0;
      const shipping = Number(currentOrder?.shipping_cost || 0);
      const tax = Number(currentOrder?.tax_amount || 0);
      const discountAmount = Number((currentOrder as any)?.discount_amount || 0);
      // Correct formula: Total = Subtotal + Shipping + Tax + PO Charges (if PO) - Discount
      const total = subtotal + handling + fred + shipping + tax - discountAmount;

      // Get discount details for display
      const discountDetails = (currentOrder as any)?.discount_details || [];
      const discountLabel = discountDetails.length > 0
        ? discountDetails.map((d: any) => d.name || "Discount").join(", ")
        : "Discount";

      const summaryBody: any[] = [
        ["Subtotal", `$${subtotal.toFixed(2)}`],
        ["Shipping & Handling", `$${(handling + shipping).toFixed(2)}`],
        ["Tax", `$${(fred + tax).toFixed(2)}`],
      ];

      // Add discount row if discount exists
      if (discountAmount > 0) {
        summaryBody.push([discountLabel, `-$${discountAmount.toFixed(2)}`]);
      }

      (doc as any).autoTable({
        body: summaryBody,
        startY: finalY,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { halign: "right", cellWidth: 45 },
          1: { halign: "right", cellWidth: 35, fontStyle: "normal" },
        },
        margin: { left: pageWidth - margin - 85 },
        tableWidth: 80,
      });

      // Total row with highlight
      const summaryFinalY = (doc as any).lastAutoTable.finalY;
      doc.setFillColor(...brandColor);
      doc.roundedRect(pageWidth - margin - 85, summaryFinalY + 2, 80, 10, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("TOTAL", pageWidth - margin - 80, summaryFinalY + 9);
      doc.text(`$${total.toFixed(2)}`, pageWidth - margin - 7, summaryFinalY + 9, { align: "right" });

      // Add Paid Amount and Balance Due for Print
      let printPaidAmountY = summaryFinalY + 14;
      if (paidAmount > 0) {
        doc.setFillColor(34, 197, 94); // Green
        doc.roundedRect(pageWidth - margin - 85, printPaidAmountY, 80, 10, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text("PAID AMOUNT", pageWidth - margin - 80, printPaidAmountY + 7);
        doc.text(`$${paidAmount.toFixed(2)}`, pageWidth - margin - 7, printPaidAmountY + 7, { align: "right" });
        printPaidAmountY += 12;
      }

      const printBalanceDue = Math.abs(total - paidAmount) < 0.01 ? 0 : Math.max(0, total - paidAmount);
      if (printBalanceDue > 0) {
        doc.setFillColor(239, 68, 68); // Red
        doc.roundedRect(pageWidth - margin - 85, printPaidAmountY, 80, 10, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text("BALANCE DUE", pageWidth - margin - 80, printPaidAmountY + 7);
        doc.text(`$${printBalanceDue.toFixed(2)}`, pageWidth - margin - 7, printPaidAmountY + 7, { align: "right" });
      } else if (paidAmount > 0) {
        doc.setFillColor(34, 197, 94); // Green
        doc.roundedRect(pageWidth - margin - 85, printPaidAmountY, 80, 10, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text("FULLY PAID", pageWidth - margin - 45, printPaidAmountY + 7, { align: "center" });
        printPaidAmountY += 12;
      }

      // ===== FOOTER =====
      // Calculate footer position dynamically based on where summary ends
      const summaryEndY = printPaidAmountY + 5;
      const minFooterY = pageHeight - 25;
      const footerY = Math.max(summaryEndY + 10, minFooterY);

      // Check if footer would go off page
      if (footerY > pageHeight - 15) {
        // Don't draw footer text if it would overlap with page number area
      } else {
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...brandColor);
        doc.text("Thank you for your business!", pageWidth / 2, footerY + 2, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);

        if (currentOrder.payment_status === "paid") {
          const transactionId = (currentOrder as any).payment_transication || "";
          if (transactionId) {
            doc.text(`Transaction ID: ${transactionId}  |  Questions? Contact us at info@9rx.com`, pageWidth / 2, footerY + 8, { align: "center" });
          } else {
            doc.text("Payment Received  |  Questions? Contact us at info@9rx.com", pageWidth / 2, footerY + 8, { align: "center" });
          }
        } else {
          doc.text("Payment Terms: Net 30  |  Questions? Contact us at info@9rx.com", pageWidth / 2, footerY + 8, { align: "center" });
        }
      }

      // Add page numbers to all pages (Page X of Y format)
      const totalPages = (doc as any).internal.getNumberOfPages();
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Ensure footer band is on this page
        doc.setFillColor(59, 130, 246);
        doc.rect(0, pdfHeight - 2, pdfWidth, 2, "F");

        // Draw white background for page number visibility
        doc.setFillColor(255, 255, 255);
        doc.rect(pdfWidth / 2 - 20, pdfHeight - 9, 40, 6, "F");

        // Draw page number text
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(`Page ${i} of ${totalPages}`, pdfWidth / 2, pdfHeight - 5, { align: "center" });
      }

      // Open PDF in iframe for printing with proper margins
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Create a hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.src = pdfUrl;

      document.body.appendChild(iframe);

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            // Fallback: open in new window if iframe print fails
            const printWindow = window.open(pdfUrl, '_blank');
            if (printWindow) {
              printWindow.onload = () => {
                setTimeout(() => {
                  printWindow.print();
                }, 300);
              };
            }
          }
          // Clean up after printing
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(pdfUrl);
          }, 1000);
        }, 500);
      };

    } catch (error) {
      console.error("Print Error:", error);
      toast({
        title: "Error",
        description: "Failed to print document.",
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
          const currentSizeRes = await supabase
            .from("product_sizes")
            .select("stock, cost_price")
            .eq("id", size.id)
            .single();
          const currentSize = (currentSizeRes.data as unknown) as { stock: number; cost_price?: number } | null;
          const fetchError = currentSizeRes.error;

          if (fetchError || !currentSize) {
            console.warn(`Size not found in Supabase for ID: ${size.id}, skipping...`);
            continue;
          }

          if (isApprove) {
            // Calculate new stock
            const newStock = currentSize.stock + size.quantity;

            // Calculate weighted average cost price
            // If cost_price is null/undefined/0 in DB, fall back to the selling price (size.price from product_sizes)
            // This treats existing stock as if it was purchased at the selling price
            const currentCostPrice = (currentSize.cost_price && currentSize.cost_price > 0 ? currentSize.cost_price : size.price) as number;
            const oldTotalCost = currentCostPrice * currentSize.stock;
            const newTotalCost = size.price * size.quantity;
            const weightedAvgCostPrice = newStock > 0 ? (oldTotalCost + newTotalCost) / newStock : size.price;

            // Enhanced debugging
            console.log(`
            🔍 PO APPROVAL - Size ID: ${size.id}
            📊 Current Data from DB:
              - Current Stock: ${currentSize.stock}
              - Current Cost Price: $${currentCostPrice}
              
            📦 PO Data:
              - PO Quantity: ${size.quantity}
              - PO Price: $${size.price}
              
            🧮 Calculation:
              - Old Total Cost: $${currentCostPrice} × ${currentSize.stock} = $${oldTotalCost.toFixed(2)}
              - New Total Cost: $${size.price} × ${size.quantity} = $${newTotalCost.toFixed(2)}
              - Combined Total: $${(oldTotalCost + newTotalCost).toFixed(2)}
              - New Stock: ${newStock}
              - Weighted Avg: $${(oldTotalCost + newTotalCost).toFixed(2)} ÷ ${newStock} = $${weightedAvgCostPrice.toFixed(2)}
              
            ✅ Updating to:
              - New Stock: ${newStock}
              - New Cost Price: $${Number(weightedAvgCostPrice.toFixed(2))}
            `);

            // Update both stock and cost_price
            const { error: updateError } = await supabase
              .from("product_sizes")
              .update({
                stock: newStock,
                cost_price: Number(weightedAvgCostPrice.toFixed(2))
              })
              .eq("id", size.id);

            if (updateError) {
              console.error(`❌ Failed to update stock and cost_price for size ID: ${size.id}`, updateError);
              throw new Error("Failed to update size quantity and cost price");
            }

            // Verify the update was successful by fetching the updated value
            const verifyRes = await supabase
              .from("product_sizes")
              .select("stock, cost_price")
              .eq("id", size.id)
              .single();
            const verifyData = (verifyRes.data as unknown) as { stock: number; cost_price?: number } | null;
            const verifyError = verifyRes.error;

            if (verifyError) {
              console.error(`❌ Failed to verify update for size ID: ${size.id}`, verifyError);
            } else {
              console.log(`✅ Database update successful for size ${size.id}`);
              console.log(`🔍 Verified values in DB: Stock=${verifyData?.stock}, Cost Price=$${verifyData?.cost_price}`);

              // Check if the values match what we expected
              if (verifyData?.stock !== newStock) {
                console.error(`⚠️ Stock mismatch! Expected ${newStock}, got ${verifyData?.stock}`);
              }
              if (Math.abs((verifyData?.cost_price ?? 0) - Number(weightedAvgCostPrice.toFixed(2))) > 0.01) {
                console.error(`⚠️ Cost price mismatch! Expected ${Number(weightedAvgCostPrice.toFixed(2))}, got ${verifyData?.cost_price}`);
              }
            }
          } else {
            // Reject: reduce stock AND reverse weighted average cost_price
            const currentAvgCost = (currentSize.cost_price && currentSize.cost_price > 0 ? currentSize.cost_price : size.price) as number;
            const currentStock = currentSize.stock;
            const poPrice = size.price;
            const poQty = size.quantity;

            // Calculate new stock
            const newStock = currentStock - poQty;

            // Reverse weighted average formula:
            // Old Cost = (Current Avg × Current Stock - PO Cost × PO Qty) / (Current Stock - PO Qty)
            const oldTotalCost = (currentAvgCost * currentStock) - (poPrice * poQty);
            const reversedCostPrice = newStock > 0 ? oldTotalCost / newStock : currentAvgCost;

            // Enhanced debugging for rejection
            console.log(`
                🔴 PO REJECTION - Size ID: ${size.id}
                📊 Current Data from DB:
                  - Current Stock: ${currentStock}
                  - Current Cost Price: ${currentAvgCost}
                  
                📦 PO Data (Being Removed):
                  - PO Quantity: ${poQty}
                  - PO Price: ${poPrice}
                  
                🧮 Reverse Calculation:
                  - Current Total Cost: ${currentAvgCost} × ${currentStock} = ${(currentAvgCost * currentStock).toFixed(2)}
                  - PO Total Cost: ${poPrice} × ${poQty} = ${(poPrice * poQty).toFixed(2)}
                  - Remaining Total: ${(currentAvgCost * currentStock).toFixed(2)} - ${(poPrice * poQty).toFixed(2)} = ${oldTotalCost.toFixed(2)}
                  - New Stock: ${newStock}
                  - Reversed Avg: ${oldTotalCost.toFixed(2)} ÷ ${newStock} = ${reversedCostPrice.toFixed(2)}
                  
                ✅ Updating to:
                  - New Stock: ${newStock}
                  - New Cost Price: ${Number(reversedCostPrice.toFixed(2))}
            `);

            const { error: updateError } = await supabase
              .from("product_sizes")
              .update({
                stock: newStock,
                cost_price: Number(reversedCostPrice.toFixed(2))
              })
              .eq("id", size.id);

            if (updateError) {
              console.error(`❌ Failed to update stock and cost_price for size ID: ${size.id}`, updateError);
              throw new Error("Failed to update size quantity and cost price");
            }

            // Verify the update was successful
            const verifyRes = await supabase
              .from("product_sizes")
              .select("stock, cost_price")
              .eq("id", size.id)
              .single();
            const verifyData = (verifyRes.data as unknown) as { stock: number; cost_price?: number } | null;
            const verifyError = verifyRes.error;

            if (verifyError) {
              console.error(`❌ Failed to verify update for size ID: ${size.id}`, verifyError);
            } else {
              console.log(`✅ Database update successful for size ${size.id}`);
              console.log(`🔍 Verified values in DB: Stock=${verifyData?.stock}, Cost Price=${verifyData?.cost_price}`);
            }
          }
        }
      }
    }
  };

  const handleApprove = async () => {
    // Check if already approved or rejected
    if ((currentOrder as any).poApproved === true) {
      toast({
        title: "Already Approved",
        description: "This purchase order has already been approved.",
        variant: "destructive",
      });
      return;
    }

    if ((currentOrder as any).poRejected === true) {
      toast({
        title: "Cannot Approve",
        description: "This purchase order has been rejected and cannot be approved.",
        variant: "destructive",
      });
      return;
    }

    // Temporarily close sheet to show popup
    onOpenChange(false);

    // Small delay to ensure sheet is closed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Show warning confirmation
    const result = await Swal.fire({
      title: "Approve Purchase Order?",
      html: `
        <div class="text-left space-y-2">
          <p class="text-gray-700">This will:</p>
          <ul class="list-disc list-inside text-gray-600 space-y-1">
            <li>Increase inventory stock</li>
            <li>Update cost prices using weighted average</li>
            <li>Mark this PO as approved</li>
          </ul>
          <p class="text-red-600 font-semibold mt-4">⚠️ This action cannot be undone!</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Approve",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "!z-[100000] rounded-xl shadow-lg",
        container: "!z-[100000]",
      },
      backdrop: true,
      allowOutsideClick: false,
    });

    if (result.isConfirmed) {
      // Reopen sheet first, then open charges dialog after a small delay
      // so the Sheet content is fully mounted before the dialog opens
      onOpenChange(true);
      await new Promise(resolve => setTimeout(resolve, 200));
      setChargesOpen(true);
    } else {
      // Reopen sheet if cancelled
      onOpenChange(true);
    }
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

      console.log("📝 Updating PO approval for order ID:", order.id);
      const { data: updateData, error: updateError } = await supabase
        .from("orders")
        .update({
          poApproved: true,
          poRejected: false,
          po_handling_charges: handling,
          po_fred_charges: fred,
          status: "approved",
        })
        .eq("id", order.id)
        .select();

      if (updateError) {
        console.error("❌ Failed to update PO approval status:", updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      if (!updateData || updateData.length === 0) {
        console.error("❌ PO approval update returned no rows - possible RLS policy issue or wrong order ID:", order.id);
        throw new Error("Update failed: no rows were updated. Check RLS policies or order ID.");
      }

      console.log("✅ PO approval updated successfully:", updateData);

      // Log PO approval activity
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await OrderActivityService.logActivity({
          orderId: order.id,
          activityType: "updated",
          description: `Purchase Order approved with handling charges: $${handling.toFixed(2)}, freight charges: $${fred.toFixed(2)}`,
          performedBy: session?.user?.id,
          performedByName: session?.user?.user_metadata?.first_name || "Admin",
          performedByEmail: session?.user?.email,
          metadata: {
            po_approved: true,
            handling_charges: handling,
            freight_charges: fred,
          },
        });
      } catch (activityError) {
        console.error("Failed to log PO approval activity:", activityError);
      }

      onOpenChange(false);
      Swal.close();

      Swal.fire({
        title: "Order Approved",
        icon: "success",
      }).then(() => window.location.reload());
    } catch (error) {
      console.error("❌ PO approval error:", error);
      Swal.close();
      Swal.fire({
        title: "Error",
        text: error instanceof Error ? error.message : "Approval failed. Check console for details.",
        icon: "error",
      });
    }
  };

  const handleReject = async () => {
    // Check if already rejected or approved
    if ((currentOrder as any).poRejected === true) {
      toast({
        title: "Already Rejected",
        description: "This purchase order has already been rejected.",
        variant: "destructive",
      });
      return;
    }

    if ((currentOrder as any).poApproved === true) {
      toast({
        title: "Cannot Reject",
        description: "This purchase order has been approved and cannot be rejected.",
        variant: "destructive",
      });
      return;
    }

    // Temporarily close sheet to show popup
    onOpenChange(false);

    // Small delay to ensure sheet is closed
    await new Promise(resolve => setTimeout(resolve, 100));

    // Show warning confirmation
    const confirmResult = await Swal.fire({
      title: "Reject Purchase Order?",
      html: `
        <div class="text-left space-y-2">
          <p class="text-gray-700">This will:</p>
          <ul class="list-disc list-inside text-gray-600 space-y-1">
            <li>Reduce inventory stock (if previously added)</li>
            <li>Mark this PO as rejected</li>
          </ul>
          <p class="text-red-600 font-semibold mt-4">⚠️ This action cannot be undone!</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Reject",
      cancelButtonText: "Cancel",
      customClass: {
        popup: "!z-[100000] rounded-xl shadow-lg",
        container: "!z-[100000]",
      },
      backdrop: true,
      allowOutsideClick: false,
    });

    if (!confirmResult.isConfirmed) {
      // Reopen sheet if cancelled
      onOpenChange(true);
      return;
    }

    try {
      Swal.fire({
        title: "Rejecting Order...",
        text: "Please wait while we update the stock and cost prices.",
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

      console.log("📝 Updating PO rejection for order ID:", order.id);
      const { data: updateData, error: updateError } = await supabase
        .from("orders")
        .update({
          poApproved: false,
          poRejected: true,
          po_handling_charges: 0,
          po_fred_charges: 0,
          status: "rejected",
        })
        .eq("id", order.id)
        .select();

      if (updateError) {
        console.error("❌ Failed to update PO rejection status:", updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      if (!updateData || updateData.length === 0) {
        console.error("❌ PO rejection update returned no rows - possible RLS policy issue or wrong order ID:", order.id);
        throw new Error("Update failed: no rows were updated. Check RLS policies or order ID.");
      }

      console.log("✅ PO rejection updated successfully:", updateData);

      // Log PO rejection activity
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await OrderActivityService.logActivity({
          orderId: order.id,
          activityType: "updated",
          description: "Purchase Order rejected - stock restored",
          performedBy: session?.user?.id,
          performedByName: session?.user?.user_metadata?.first_name || "Admin",
          performedByEmail: session?.user?.email,
          metadata: {
            po_approved: false,
            handling_charges: 0,
            freight_charges: 0,
          },
        });
      } catch (activityError) {
        console.error("Failed to log PO rejection activity:", activityError);
      }

      onOpenChange(false);
      Swal.close();

      Swal.fire({
        title: "Order Rejected",
        text: "Stock and cost prices have been reversed successfully!",
        icon: "success",
        confirmButtonText: "OK",
        confirmButtonColor: "#dc2626",
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

  // Use simplified view for pharmacy users (not editing, not PO)
  if (userRole === "pharmacy" && !isEditing && !poIs) {
    return (
      <PharmacyOrderDetails
        order={currentOrder}
        open={open}
        onOpenChange={onOpenChange}
      />
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg md:max-w-2xl lg:max-w-3xl max-h-[95vh] overflow-hidden z-50 p-3 sm:p-4 md:p-6 flex flex-col gap-3">
          <SheetHeader className="mb-1 sm:mb-2">
            <SheetTitle className="text-base sm:text-lg md:text-xl">Order Details</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm md:text-base">
              {isEditing ? "Edit order details" : "View and manage order information"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto pr-1 sm:pr-2">
            {isEditing ? (
              <div className="mt-4 sm:mt-6">
                <CreateOrderForm
                  initialData={currentOrder}
                  isEditing={isEditing}
                  poIs={poIs}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setCurrentOrder(order); // Reset to original order data
                  }}
                  className="mt-4 w-full md:w-auto"
                >
                  Cancel Edit
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Order Header */}
                <OrderHeader
                  order={currentOrder}
                  onEdit={() => {
                    // Navigate to new flow for editing
                    const editUrl = poIs ? `/admin/po/edit/${currentOrder.id}` : `/admin/orders/edit/${currentOrder.id}`;
                    window.location.href = editUrl;
                  }}
                  onDownload={handleDownloadPDF}
                  onDelete={onDeleteOrder ? () => onDeleteOrder(currentOrder.id) : undefined}
                  onSendEmail={sendMail}
                  onShipOrder={onShipOrder ? () => handleStatusUpdate("ship") : undefined}
                  onPrint={handlePrint}
                  isGeneratingPDF={isGeneratingPDF}
                  isSendingEmail={loading}
                  userRole={userRole}
                  poIs={poIs}
                />

                {/* Tabs */}
                <Tabs key={currentOrder.id} defaultValue="overview" className="w-full">
                  <TabsList className="w-full h-auto flex sm:grid sm:grid-cols-6 gap-1 mb-4 bg-muted/50 p-1 rounded-lg overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/30">
                    <TabsTrigger value="overview" className="text-[11px] sm:text-xs md:text-sm flex-1 sm:flex-none px-2 py-1.5 whitespace-nowrap">
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="items" className="text-[11px] sm:text-xs md:text-sm flex-1 sm:flex-none px-2 py-1.5 whitespace-nowrap">
                      Items
                    </TabsTrigger>
                    <TabsTrigger value="customer" className="text-[11px] sm:text-xs md:text-sm flex-1 sm:flex-none px-2 py-1.5 whitespace-nowrap">
                      {poIs ? "Vendor" : "Customer"}
                    </TabsTrigger>
                    <TabsTrigger value="payment" className="text-[11px] sm:text-xs md:text-sm flex-1 sm:flex-none px-2 py-1.5 whitespace-nowrap">
                      Payment
                    </TabsTrigger>
                    <TabsTrigger value="shipping" className="text-[11px] sm:text-xs md:text-sm flex-1 sm:flex-none px-2 py-1.5 whitespace-nowrap">
                      Shipping
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="text-[11px] sm:text-xs md:text-sm flex-1 sm:flex-none px-2 py-1.5 whitespace-nowrap">
                      Activity
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-0">
                    <OverviewTab order={currentOrder} companyName={companyName} poIs={poIs} />
                  </TabsContent>

                  <TabsContent value="items" className="mt-0">
                    <ItemsTab
                      items={currentOrder.items}
                      orderId={currentOrder.id}
                      customerId={currentOrder.customer || (currentOrder as any).location_id || (currentOrder as any).profile_id}
                      orderNumber={currentOrder.order_number}
                      customerEmail={currentOrder.customerInfo?.email}
                      paymentStatus={currentOrder.payment_status}
                      shippingCost={parseFloat(currentOrder.shipping_cost || "0")}
                      taxAmount={currentOrder.tax_amount || 0}
                      discountAmount={Number((currentOrder as any).discount_amount || 0)}
                      onItemsUpdate={(updatedItems) => {
                        // Calculate new subtotal from items
                        const newSubtotal = updatedItems.reduce((acc, item) => {
                          return acc + item.sizes.reduce((sum, size) => sum + size.quantity * size.price, 0);
                        }, 0);
                        const taxAmount = currentOrder.tax_amount || 0;
                        const shippingCost = parseFloat(currentOrder.shipping_cost || "0");
                        const discountAmount = Number((currentOrder as any).discount_amount || 0);
                        const newTotal = newSubtotal + taxAmount + shippingCost - discountAmount;

                        setCurrentOrder(prev => ({
                          ...prev,
                          items: updatedItems,
                          total: newTotal.toFixed(2)
                        }));
                      }}
                      onOrderUpdate={() => loadOrders?.(poIs)}
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
                      orderId={currentOrder.id}
                      onOrderUpdate={() => loadOrders?.(poIs)}
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
                      orderId={currentOrder.id}
                      onOrderUpdate={() => loadOrders?.(poIs)}
                      userRole={userRole}
                    />
                  </TabsContent>

                  <TabsContent value="activity" className="mt-0">
                    <ActivityTab order={currentOrder} />
                  </TabsContent>
                </Tabs>

                {/* Admin Actions */}
                {userRole === "admin" && !poIs && (
                  <div className="flex flex-col sm:flex-row justify-end sm:items-center gap-2 sm:gap-3 mt-4 pt-4 border-t">

                    <button
                      onClick={handleDownloadPackingSlip}
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow hover:shadow-lg transition duration-300 w-full sm:w-auto"
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
              </div>
            )}
          </div>

          {/* PO Actions - Fixed Footer (Outside scrollable area) */}
          {poIs && !isEditing && (
            <div className="flex flex-col sm:flex-row w-full justify-end gap-3 pt-3 border-t border-gray-200 bg-white">
              {/* Show status badge if already processed */}
              {((currentOrder as any).poApproved || (currentOrder as any).poRejected) && (
                <div className="flex items-center gap-2 mr-auto">
                  {(currentOrder as any).poApproved && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      <CheckCircle size={16} />
                      Approved
                    </span>
                  )}
                  {(currentOrder as any).poRejected && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      <XCircle size={16} />
                      Rejected
                    </span>
                  )}
                </div>
              )}

              {/* Approve Button - disabled if already approved or rejected */}
              <Button
                onClick={handleApprove}
                disabled={(currentOrder as any).poApproved || (currentOrder as any).poRejected}
                className="gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <CheckCircle size={18} />
                Approve Purchase
              </Button>

              {/* Reject Button - disabled if already rejected or approved */}
              <Button
                onClick={handleReject}
                disabled={(currentOrder as any).poRejected || (currentOrder as any).poApproved}
                variant="destructive"
                className="gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <XCircle size={18} />
                Reject Purchase
              </Button>
            </div>
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
