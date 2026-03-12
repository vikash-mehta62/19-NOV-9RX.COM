import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Package, Loader2, CalendarClock, PackageCheck, Wallet, ReceiptText, Truck, Download } from "lucide-react";
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
import autoTable from "jspdf-autotable";
import JsBarcode from "jsbarcode";
import Swal from "sweetalert2";
import { ChargesDialog } from "./ChargesDialog";
import { PackingSlipModal } from "../PackingSlipModal";
import { PharmacyOrderDetails } from "@/components/pharmacy/PharmacyOrderDetails";
import Logo from "../../../assests/home/9rx_logo.png";
import { OrderActivityService } from "@/services/orderActivityService";
import { formatDate } from "../utils/dateUtils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { getPoWorkflowBadgeClass, getPoWorkflowLabel, getPoWorkflowState } from "../utils/poWorkflow";

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

const toDateInputValue = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
};

const formatDateOnly = (value?: string | null) => {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value).slice(0, 10);
  }
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const sanitizeJsonObject = <T extends Record<string, any>>(value: T): T => {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined && !(typeof entry === "number" && Number.isNaN(entry)))
  ) as T;
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
  const [activePoTab, setActivePoTab] = useState("workspace");
  const [receivingQuantities, setReceivingQuantities] = useState<Record<string, string>>({});
  const [receivingNotes, setReceivingNotes] = useState("");
  const [isSavingPoWorkflow, setIsSavingPoWorkflow] = useState(false);
  const [poFinance, setPoFinance] = useState({
    expectedDelivery: "",
    paymentMethod: "manual",
    paymentDate: "",
    paymentReference: "",
    paymentAmount: "",
    freightCharges: "",
    handlingCharges: "",
    financeNotes: "",
    includePricingInPdf: true,
  });
  const [isUploadingPoDocument, setIsUploadingPoDocument] = useState(false);
  const [poDocuments, setPoDocuments] = useState<any[]>([]);
  const [poPayments, setPoPayments] = useState<any[]>([]);

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

  const loadPoDocuments = useCallback(async () => {
    if (!currentOrder?.id || !poIs) {
      setPoDocuments([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("po_documents" as any)
        .select("id, order_id, name, file_path, file_size, url, uploaded_at")
        .eq("order_id", currentOrder.id)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;

      if (isMountedRef.current) {
        setPoDocuments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error("Error loading PO documents:", error);
      }
    }
  }, [currentOrder?.id, poIs]);

  useEffect(() => {
    loadPoDocuments();
  }, [loadPoDocuments]);

  const loadPoPayments = useCallback(async () => {
    if (!currentOrder?.id || !poIs) {
      setPoPayments([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("po_payments" as any)
        .select("id, amount, payment_date, payment_method, reference, note, created_at")
        .eq("order_id", currentOrder.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (isMountedRef.current) {
        setPoPayments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error("Error loading PO payments:", error);
      }
    }
  }, [currentOrder?.id, poIs]);

  useEffect(() => {
    loadPoPayments();
  }, [loadPoPayments]);

  const syncPoExpenseEntry = useCallback(
    async ({
      amount,
      category,
      sourceSubtype,
      name,
      description,
      date,
    }: {
      amount: number;
      category: "cost_of_goods_sold" | "other_expense";
      sourceSubtype: string;
      name: string;
      description: string;
      date: string;
    }) => {
      if (!currentOrder?.id) return;

      const normalizedAmount = Number(amount || 0);

      if (normalizedAmount <= 0) {
        await supabase
          .from("expenses")
          .delete()
          .eq("source_type", "purchase_order")
          .eq("source_id", currentOrder.id)
          .eq("source_subtype", sourceSubtype);
        return;
      }

      const expensePayload = {
        name,
        amount: normalizedAmount,
        description,
        date,
        category,
        source_type: "purchase_order",
        source_id: currentOrder.id,
        source_subtype: sourceSubtype,
      };

      const { data: existingExpense, error: lookupError } = await supabase
        .from("expenses")
        .select("id")
        .eq("source_type", "purchase_order")
        .eq("source_id", currentOrder.id)
        .eq("source_subtype", sourceSubtype)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existingExpense?.id) {
        const { error: updateError } = await supabase
          .from("expenses")
          .update(expensePayload)
          .eq("id", existingExpense.id);

        if (updateError) throw updateError;
        return;
      }

      const { error: insertError } = await supabase
        .from("expenses")
        .insert(expensePayload);

      if (insertError) throw insertError;
    },
    [currentOrder?.id]
  );

  const syncPoChargeExpenses = useCallback(
    async (freightCharges: number, handlingCharges: number) => {
      const today = new Date().toISOString().slice(0, 10);
      const poLabel = currentOrder.order_number || currentOrder.id;

      await syncPoExpenseEntry({
        amount: freightCharges,
        category: "other_expense",
        sourceSubtype: "freight_charge",
        name: `PO Freight ${poLabel}`,
        description: `Freight charge for purchase order ${poLabel}`,
        date: today,
      });

      await syncPoExpenseEntry({
        amount: handlingCharges,
        category: "other_expense",
        sourceSubtype: "handling_charge",
        name: `PO Handling ${poLabel}`,
        description: `Handling charge for purchase order ${poLabel}`,
        date: today,
      });
    },
    [currentOrder.id, currentOrder.order_number, syncPoExpenseEntry]
  );

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
      setCurrentOrder((prev) => ({
        ...prev,
        payment_status: String(orderData?.payment_status || prev.payment_status || ""),
        total: Number(orderData?.total_amount ?? prev.total ?? 0).toFixed(2),
      }));
    } catch (error) {
      console.error("Error fetching paid amount:", error);
    }
  }, [currentOrder?.id]);

  useEffect(() => {
    fetchPaidAmount();
  }, [fetchPaidAmount]);

  useEffect(() => {
    if (!poIs) return;

    const shippingData = ((currentOrder as any)?.shipping || {}) as any;
    const paymentData = ((currentOrder as any)?.payment || {}) as any;

    setPoFinance({
      expectedDelivery: toDateInputValue(shippingData.estimatedDelivery),
      paymentMethod: paymentData.method || "manual",
      paymentDate: toDateInputValue(paymentData.date),
      paymentReference: paymentData.reference || "",
      paymentAmount: paidAmount > 0 ? paidAmount.toFixed(2) : "",
      freightCharges: String((currentOrder as any)?.po_fred_charges || ""),
      handlingCharges: String((currentOrder as any)?.po_handling_charges || ""),
      financeNotes: paymentData.notes || "",
      includePricingInPdf: paymentData.includePricingInPdf !== false,
    });

    const nextReceiving: Record<string, string> = {};
    (currentOrder.items || []).forEach((item: any, itemIndex: number) => {
      (item.sizes || []).forEach((size: any, sizeIndex: number) => {
        const orderedQty = Number(size.quantity) || 0;
        const receivedQty = Number(size.received_quantity || 0);
        const remainingQty = Math.max(0, orderedQty - receivedQty);
        nextReceiving[`${itemIndex}-${sizeIndex}`] = remainingQty > 0 ? String(remainingQty) : "0";
      });
    });
    setReceivingQuantities(nextReceiving);
    setReceivingNotes(((currentOrder as any)?.receiving_notes as string) || "");
  }, [poIs, currentOrder, paidAmount]);

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

  const formattedDate = formatDate(currentOrder.date || (currentOrder as any).created_at);

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

  const loadPdfLogo = async () => {
    try {
      const logo = new Image();
      logo.src = Logo;
      await new Promise<void>((resolve) => {
        logo.onload = () => resolve();
        logo.onerror = () => resolve();
        setTimeout(() => resolve(), 3000);
      });
      return logo.width > 0 ? logo : null;
    } catch {
      return null;
    }
  };

  const buildOrderPdfBlob = async () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const brandColor: [number, number, number] = [59, 130, 246];
    const darkGray: [number, number, number] = [60, 60, 60];
    const lightGray: [number, number, number] = [245, 245, 245];
    const showPricing = !poIs || poIncludePricingInPdf;
    const invoiceNumber = (currentOrder as any).invoice_number;
    const isNewOrder = currentOrder.status === "new" || currentOrder.status === "pending";
    const documentTitle = poIs ? "PURCHASE ORDER" : invoiceNumber && !isNewOrder ? "INVOICE" : "SALES ORDER";
    const documentNumber = poIs ? currentOrder.order_number : invoiceNumber && !isNewOrder ? invoiceNumber : currentOrder.order_number;
    const shippingData = ((currentOrder as any)?.shipping || {}) as any;
    const vendorReference = (currentOrder as any)?.purchase_number_external || "Internal PO";
    const pdfPoWorkflowState = getPoWorkflowState(currentOrder);
    const poStatusLabel = getPoWorkflowLabel(pdfPoWorkflowState).toUpperCase();
    const poStatusColor: [number, number, number] =
      pdfPoWorkflowState === "rejected"
        ? [239, 68, 68]
        : pdfPoWorkflowState === "closed"
          ? [16, 185, 129]
          : pdfPoWorkflowState === "received"
            ? [139, 92, 246]
            : pdfPoWorkflowState === "partially_received"
              ? [245, 158, 11]
              : pdfPoWorkflowState === "approved"
                ? [34, 197, 94]
                : [100, 116, 139];
    const logo = await loadPdfLogo();

    const subtotal = (currentOrder.items || []).reduce((sum: number, item: any) => {
      return sum + (item.sizes || []).reduce((sizeSum: number, size: any) => sizeSum + ((Number(size.quantity) || 0) * (Number(size.price) || 0)), 0);
    }, 0);
    const handling = poIs ? Number((currentOrder as any)?.po_handling_charges || 0) : 0;
    const freight = poIs ? Number((currentOrder as any)?.po_fred_charges || 0) : 0;
    const shipping = Number(currentOrder?.shipping_cost || 0);
    const tax = Number(currentOrder?.tax_amount || 0);
    const discountAmount = Number((currentOrder as any)?.discount_amount || 0);
    const total = subtotal + handling + freight + shipping + tax - discountAmount;

    doc.setFillColor(...brandColor);
    doc.rect(0, 0, pageWidth, 5, "F");

    if (logo) {
      const logoHeight = 20;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      doc.addImage(logo, "PNG", margin, 6, logoWidth, logoHeight);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...darkGray);
    doc.text("9RX LLC", margin, logo ? 32 : 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("936 Broad River Ln, Charlotte, NC 28211", margin, logo ? 38 : 22);
    doc.text("Phone: +1 (800) 940-9619  |  Email: info@9rx.com", margin, logo ? 43 : 27);
    doc.text("Tax ID: 99-0540972  |  www.9rx.com", margin, logo ? 48 : 32);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...brandColor);
    doc.text(documentTitle, pageWidth - margin, 16, { align: "right" });
    doc.setFontSize(10);
    doc.setTextColor(...darkGray);
    doc.text(`# ${documentNumber}`, pageWidth - margin, 24, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${formattedDate}`, pageWidth - margin, 30, { align: "right" });
    if (poIs) {
      doc.text(`Vendor Ref: ${vendorReference}`, pageWidth - margin, 35, { align: "right" });
      doc.text(`Expected: ${formatDateOnly(shippingData.estimatedDelivery)}`, pageWidth - margin, 40, { align: "right" });
    } else if (invoiceNumber && !isNewOrder) {
      doc.text(`SO Ref: ${currentOrder.order_number}`, pageWidth - margin, 35, { align: "right" });
    }

    const badgeY = poIs ? 45 : 34;
    const badgeLabel = poIs ? poStatusLabel : currentOrder.payment_status === "paid" ? "PAID" : "UNPAID";
    const badgeColor = poIs ? poStatusColor : currentOrder.payment_status === "paid" ? [34, 197, 94] as [number, number, number] : [239, 68, 68] as [number, number, number];
    const badgeWidth = poIs ? 34 : badgeLabel === "PAID" ? 25 : 30;
    doc.setFillColor(...badgeColor);
    doc.roundedRect(pageWidth - margin - badgeWidth, badgeY, badgeWidth, 8, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(badgeLabel, pageWidth - margin - badgeWidth / 2, badgeY + 5.5, { align: "center" });

    try {
      const barcodeDataUrl = generateBarcode(documentNumber);
      doc.addImage(barcodeDataUrl, "PNG", pageWidth - margin - 50, badgeY + 10, 50, 12);
    } catch {
      // noop
    }

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, 62, pageWidth - margin, 62);

    const infoStartY = 67;
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
      lines.filter(Boolean).slice(0, 5).forEach((line) => {
        doc.text(line, x + 5, y, { maxWidth: boxWidth - 10 });
        y += 5;
      });
    };

    if (poIs) {
      const vendorAddress = [
        currentOrder.customerInfo?.address?.street,
        [currentOrder.customerInfo?.address?.city, currentOrder.customerInfo?.address?.state, currentOrder.customerInfo?.address?.zip_code].filter(Boolean).join(", "),
      ].filter(Boolean).join(" ");
      drawInfoBox("VENDOR", margin, [
        companyName || currentOrder.customerInfo?.name,
        currentOrder.customerInfo?.name,
        currentOrder.customerInfo?.phone,
        currentOrder.customerInfo?.email,
        vendorAddress,
      ]);
      drawInfoBox("SHIP TO", margin * 2 + boxWidth, [
        "9RX LLC",
        "936 Broad River Ln",
        "Charlotte, NC 28211",
        shippingData.method ? `Method: ${shippingData.method}` : "",
        showPricing ? "Pricing included on vendor copy" : "Pricing hidden on vendor copy",
      ]);
    } else {
      const billingAddr = currentOrder.customerInfo?.address || {};
      const shippingAddr = (currentOrder.shippingAddress as any)?.address || {};
      drawInfoBox("BILL TO", margin, [
        companyName,
        currentOrder.customerInfo?.name,
        currentOrder.customerInfo?.phone,
        currentOrder.customerInfo?.email,
        [billingAddr.street, [billingAddr.city, billingAddr.state, billingAddr.zip_code].filter(Boolean).join(", ")].filter(Boolean).join(" "),
      ]);
      drawInfoBox("SHIP TO", margin * 2 + boxWidth, [
        (currentOrder.shippingAddress as any)?.fullName || companyName,
        (currentOrder.shippingAddress as any)?.phone || currentOrder.customerInfo?.phone,
        shippingAddr.street || "",
        [shippingAddr.city, shippingAddr.state, shippingAddr.zip_code].filter(Boolean).join(", "),
      ]);
    }

    let nextSectionY = infoStartY + 42;
    if (poIs) {
      autoTable(doc as any, {
        body: [
          ["Vendor Reference", vendorReference, "Expected Delivery", formatDateOnly(shippingData.estimatedDelivery)],
          ["Shipping Method", shippingData.method || "Not set", "Pricing", showPricing ? "Included" : "Hidden"],
        ],
        startY: nextSectionY,
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        columnStyles: {
          0: { fontStyle: "bold", fillColor: [248, 250, 252] },
          2: { fontStyle: "bold", fillColor: [248, 250, 252] },
        },
        margin: { left: margin, right: margin },
      });
      nextSectionY = (doc as any).lastAutoTable.finalY + 6;
    }

    const tableHead = poIs
      ? showPricing
        ? [["#", "Item", "Size / Pack", "Qty", "Unit Cost", "Line Total"]]
        : [["#", "Item", "Size / Pack", "Qty"]]
      : [["#", "Description", "Size", "Qty", "Unit Price", "Total"]];
    const tableBody: any[] = [];
    let itemIndex = 1;

    (currentOrder.items || []).forEach((item: any) => {
      (item.sizes || []).forEach((size: any, sizeIndex: number) => {
        const sizePack = [
          [size.size_value, size.size_unit].filter(Boolean).join(" "),
          size.quantity_per_case ? `${size.quantity_per_case}/case` : "",
          size.sku || "",
        ].filter(Boolean).join(" • ");

        tableBody.push(
          poIs
            ? showPricing
              ? [itemIndex.toString(), item.name, sizePack || "Standard", String(size.quantity || 0), `$${Number(size.price || 0).toFixed(2)}`, `$${(Number(size.quantity || 0) * Number(size.price || 0)).toFixed(2)}`]
              : [itemIndex.toString(), item.name, sizePack || "Standard", String(size.quantity || 0)]
            : [itemIndex.toString(), item.name, [size.size_value, size.size_unit].filter(Boolean).join(" "), String(size.quantity || 0), `$${Number(size.price || 0).toFixed(2)}`, `$${(Number(size.quantity || 0) * Number(size.price || 0)).toFixed(2)}`]
        );
        itemIndex += 1;

        if (sizeIndex === 0 && item.description && item.description.trim()) {
          tableBody.push(
            poIs && !showPricing
              ? ["", { content: `↳ ${item.description.trim()}`, styles: { fontStyle: "italic", textColor: [120, 120, 120], fontSize: 8 } }, "", ""]
              : ["", { content: `↳ ${item.description.trim()}`, styles: { fontStyle: "italic", textColor: [120, 120, 120], fontSize: 8 } }, "", "", "", ""]
          );
        }
      });
    });

    autoTable(doc as any, {
      head: tableHead,
      body: tableBody,
      startY: nextSectionY,
      styles: { fontSize: 9, cellPadding: 3 },
      theme: "striped",
      headStyles: { fillColor: brandColor, textColor: 255, fontStyle: "bold", halign: "center" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: poIs
        ? showPricing
          ? { 0: { halign: "center", cellWidth: 10 }, 1: { cellWidth: 56 }, 2: { cellWidth: 45 }, 3: { halign: "center", cellWidth: 14 }, 4: { halign: "right", cellWidth: 25 }, 5: { halign: "right", cellWidth: 26 } }
          : { 0: { halign: "center", cellWidth: 10 }, 1: { cellWidth: 75 }, 2: { cellWidth: 70 }, 3: { halign: "center", cellWidth: 20 } }
        : { 0: { halign: "center", cellWidth: 10 }, 1: { cellWidth: "auto" }, 2: { halign: "center", cellWidth: 25 }, 3: { halign: "center", cellWidth: 15 }, 4: { halign: "right", cellWidth: 25 }, 5: { halign: "right", cellWidth: 25 } },
      margin: { left: margin, right: margin, bottom: 30 },
      showHead: "everyPage",
      didDrawPage: () => {
        doc.setFillColor(...brandColor);
        doc.rect(0, 0, pageWidth, 5, "F");
        doc.rect(0, pageHeight - 2, pageWidth, 2, "F");
      },
    });

    let footerAnchorY = (doc as any).lastAutoTable.finalY + 8;
    if (showPricing) {
      const summaryBody: any[] = poIs
        ? [["Subtotal", `$${subtotal.toFixed(2)}`], ["Freight", `$${freight.toFixed(2)}`], ["Handling", `$${handling.toFixed(2)}`]]
        : [["Subtotal", `$${subtotal.toFixed(2)}`], ["Shipping & Handling", `$${(handling + shipping).toFixed(2)}`], ["Tax", `$${(freight + tax).toFixed(2)}`]];

      if (!poIs && discountAmount > 0) {
        summaryBody.push(["Discount", `-$${discountAmount.toFixed(2)}`]);
      }

      autoTable(doc as any, {
        body: summaryBody,
        startY: footerAnchorY,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { halign: "right", cellWidth: 45 },
          1: { halign: "right", cellWidth: 35, fontStyle: "normal" },
        },
        margin: { left: pageWidth - margin - 85 },
        tableWidth: 80,
      });

      const summaryFinalY = (doc as any).lastAutoTable.finalY;
      doc.setFillColor(...brandColor);
      doc.roundedRect(pageWidth - margin - 85, summaryFinalY + 2, 80, 10, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("TOTAL", pageWidth - margin - 80, summaryFinalY + 9);
      doc.text(`$${total.toFixed(2)}`, pageWidth - margin - 7, summaryFinalY + 9, { align: "right" });

      let paymentY = summaryFinalY + 14;
      if (paidAmount > 0) {
        doc.setFillColor(34, 197, 94);
        doc.roundedRect(pageWidth - margin - 85, paymentY, 80, 10, 1, 1, "F");
        doc.setFontSize(10);
        doc.text("PAID", pageWidth - margin - 80, paymentY + 7);
        doc.text(`$${paidAmount.toFixed(2)}`, pageWidth - margin - 7, paymentY + 7, { align: "right" });
        paymentY += 12;
      }
      const balanceDue = Math.max(0, total - paidAmount);
      if (balanceDue > 0 && !poIs) {
        doc.setFillColor(239, 68, 68);
        doc.roundedRect(pageWidth - margin - 85, paymentY, 80, 10, 1, 1, "F");
        doc.text("BALANCE DUE", pageWidth - margin - 80, paymentY + 7);
        doc.text(`$${balanceDue.toFixed(2)}`, pageWidth - margin - 7, paymentY + 7, { align: "right" });
        paymentY += 12;
      }
      footerAnchorY = paymentY;
    }

    const footerY = Math.max(footerAnchorY + 8, pageHeight - 25);
    if (footerY <= pageHeight - 15) {
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...brandColor);
      doc.text(poIs ? "Purchase order prepared for vendor fulfillment" : "Thank you for your business!", pageWidth / 2, footerY + 2, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(poIs ? (showPricing ? "Includes cost detail for internal/vendor approval." : "Quantity-only vendor copy. Pricing intentionally hidden.") : (currentOrder.payment_status === "paid" ? "Payment received  |  Questions? Contact us at info@9rx.com" : "Payment Terms: Net 30  |  Questions? Contact us at info@9rx.com"), pageWidth / 2, footerY + 8, { align: "center" });
    }

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFillColor(...brandColor);
      doc.rect(0, pageHeight - 2, pageWidth, 2, "F");
      doc.setFillColor(255, 255, 255);
      doc.rect(pageWidth / 2 - 20, pageHeight - 9, 40, 6, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: "center" });
    }

    return doc.output("blob");
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);

    try {
      const generatedBlob = await buildOrderPdfBlob();
      const generatedUrl = URL.createObjectURL(generatedBlob);
      const anchor = document.createElement("a");
      anchor.href = generatedUrl;
      anchor.download = `${currentOrder.order_number}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(generatedUrl), 1000);
      toast({
        title: "Success",
        description: poIs ? "PO PDF downloaded successfully." : "Document downloaded successfully.",
      });
      return;

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
      doc.text("Phone: +1 (800) 940-9619  |  Email: info@9rx.com", margin, logoLoaded ? 43 : 27);
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
          "+1 (800) 940-9619",
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
      autoTable(doc as any, {
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

      autoTable(doc as any, {
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
      const generatedBlob = await buildOrderPdfBlob();
      const generatedUrl = URL.createObjectURL(generatedBlob);
      const printFrame = document.createElement("iframe");
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "none";
      printFrame.src = generatedUrl;
      document.body.appendChild(printFrame);

      printFrame.onload = () => {
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch {
            const printWindow = window.open(generatedUrl, "_blank");
            if (printWindow) {
              printWindow.onload = () => setTimeout(() => printWindow.print(), 300);
            }
          }
          setTimeout(() => {
            if (document.body.contains(printFrame)) {
              document.body.removeChild(printFrame);
            }
            URL.revokeObjectURL(generatedUrl);
          }, 1000);
        }, 500);
      };
      return;

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
      doc.text("Phone: +1 (800) 940-9619  |  Email: info@9rx.com", margin, logoLoaded ? 43 : 27);
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
          "+1 (800) 940-9619",
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

      autoTable(doc as any, {
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

      autoTable(doc as any, {
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

  const poSubtotal = (currentOrder.items || []).reduce((sum: number, item: any) => {
    return sum + (item.sizes || []).reduce((sizeSum: number, size: any) => {
      return sizeSum + ((Number(size.quantity) || 0) * (Number(size.price) || 0));
    }, 0);
  }, 0);

  const poOrderedUnits = (currentOrder.items || []).reduce((sum: number, item: any) => {
    return sum + (item.sizes || []).reduce((sizeSum: number, size: any) => sizeSum + (Number(size.quantity) || 0), 0);
  }, 0);

  const poReceivedUnits = (currentOrder.items || []).reduce((sum: number, item: any) => {
    return sum + (item.sizes || []).reduce((sizeSum: number, size: any) => sizeSum + (Number(size.received_quantity) || 0), 0);
  }, 0);

  const poOpenUnits = Math.max(0, poOrderedUnits - poReceivedUnits);
  const poReceiveProgress = poOrderedUnits > 0 ? Math.min(100, Math.round((poReceivedUnits / poOrderedUnits) * 100)) : 0;
  const poFullyReceived = poOrderedUnits > 0 && poOpenUnits === 0;
  const poChargesTotal = Number((currentOrder as any)?.po_handling_charges || 0) + Number((currentOrder as any)?.po_fred_charges || 0);
  const poGrossAmount = Number(currentOrder.total || currentOrder.total_amount || 0) + poChargesTotal;
  const poLandedCostAmount = poGrossAmount;
  const poOutstandingAmount = Math.max(0, poGrossAmount - paidAmount);
  const poPaymentDraftAmount = Math.max(0, Number(poFinance.paymentAmount || 0));
  const poAppliedAfterDraft = Math.min(poGrossAmount, paidAmount + poPaymentDraftAmount);
  const poPendingAfterDraft = Math.max(0, poGrossAmount - poAppliedAfterDraft);
  const isPoFullyPaid = poGrossAmount > 0 && poOutstandingAmount <= 0;
  const poPaidPercent = poGrossAmount > 0 ? Math.min(100, Math.round((paidAmount / poGrossAmount) * 100)) : 0;
  const poPaidPercentAfterDraft = poGrossAmount > 0 ? Math.min(100, Math.round((poAppliedAfterDraft / poGrossAmount) * 100)) : 0;
  const hasAnyReceivedInventory = poReceivedUnits > 0;
  const poCanReceive = Boolean((currentOrder as any)?.poApproved) && !Boolean((currentOrder as any)?.poRejected);
  const poCanRecordPayment = Number(poFinance.paymentAmount || 0) > 0;
  const poCanReject = !Boolean((currentOrder as any)?.poRejected) && !hasAnyReceivedInventory && !isSavingPoWorkflow;
  const poPaymentLedger = poPayments.length > 0
    ? poPayments.map((entry: any) => ({
      id: entry.id,
      amount: Number(entry.amount || 0),
      date: entry.payment_date,
      method: entry.payment_method || "manual",
      reference: entry.reference || "",
      note: entry.note || "",
      recorded_at: entry.created_at,
    }))
    : Array.isArray(((currentOrder as any)?.payment || {})?.payments)
      ? (((currentOrder as any)?.payment || {}) as any).payments
      : [];
  const poPaymentHistory = poPaymentLedger
    .slice()
    .sort((a: any, b: any) => new Date(a.recorded_at || a.date || 0).getTime() - new Date(b.recorded_at || b.date || 0).getTime())
    .map((entry: any, index: number, entries: any[]) => {
      const paidBefore = entries.slice(0, index).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
      const paidAfter = paidBefore + Number(entry.amount || 0);
      return {
        ...entry,
        paidBefore,
        paidAfter,
        pendingAfter: Math.max(0, poGrossAmount - paidAfter),
      };
    });
  const poIncludePricingInPdf = poFinance.includePricingInPdf !== false;
  const poWorkflowState = getPoWorkflowState(currentOrder);
  const poWorkflowLabel = getPoWorkflowLabel(poWorkflowState);

  const persistCurrentOrder = (updates: Record<string, any>) => {
    setCurrentOrder((prev: any) => ({
      ...prev,
      ...updates,
    }));
  };

  const handleApproveWorkflow = async () => {
    if ((currentOrder as any).poApproved) return;

    setIsSavingPoWorkflow(true);
    try {
      const handlingCharges = Number(poFinance.handlingCharges || 0);
      const freightCharges = Number(poFinance.freightCharges || 0);
      const updatedShipping = {
        ...((currentOrder as any)?.shipping || {}),
        estimatedDelivery: poFinance.expectedDelivery || "",
      };
      const updatedPayment = {
        ...((currentOrder as any)?.payment || {}),
        method: poFinance.paymentMethod || "manual",
        notes: poFinance.financeNotes || "",
        includePricingInPdf: poFinance.includePricingInPdf !== false,
      };

      const { error } = await supabase
        .from("orders")
        .update({
          poApproved: true,
          poRejected: false,
          status: "approved",
          po_handling_charges: handlingCharges,
          po_fred_charges: freightCharges,
          shipping_method: updatedShipping.method || null,
          estimated_delivery: updatedShipping.estimatedDelivery || null,
          payment_method: updatedPayment.method || "manual",
          payment_notes: updatedPayment.notes || null,
        })
        .eq("id", currentOrder.id);

      if (error) throw error;

      await syncPoChargeExpenses(freightCharges, handlingCharges);

      await OrderActivityService.logActivity({
        orderId: currentOrder.id,
        activityType: "updated",
        description: "Purchase order approved and moved to inbound processing",
        metadata: {
          expected_delivery: poFinance.expectedDelivery || null,
          handling_charges: handlingCharges,
          freight_charges: freightCharges,
        },
      });

      persistCurrentOrder({
        poApproved: true,
        poRejected: false,
        status: "approved",
        po_handling_charges: handlingCharges,
        po_fred_charges: freightCharges,
        shipping: updatedShipping,
        payment: updatedPayment,
        shipping_method: updatedShipping.method || null,
        estimated_delivery: updatedShipping.estimatedDelivery || null,
        payment_method: updatedPayment.method || "manual",
        payment_notes: updatedPayment.notes || null,
      });

      toast({
        title: "PO approved",
        description: "Inventory was not received yet. Use the Receive step when goods arrive.",
      });
    } catch (error) {
      console.error("Error approving PO workflow:", error);
      toast({
        title: "Approval failed",
        description: "Could not approve this purchase order.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPoWorkflow(false);
    }
  };

  const handleRejectWorkflow = async () => {
    if (hasAnyReceivedInventory) {
      toast({
        title: "Cannot reject",
        description: "This PO already has received inventory. Resolve receiving first instead of rejecting.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPoWorkflow(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          poApproved: false,
          poRejected: true,
          status: "rejected",
        })
        .eq("id", currentOrder.id);

      if (error) throw error;

      await OrderActivityService.logActivity({
        orderId: currentOrder.id,
        activityType: "updated",
        description: "Purchase order rejected before receiving",
      });

      persistCurrentOrder({
        poApproved: false,
        poRejected: true,
        status: "rejected",
      });

      toast({
        title: "PO rejected",
        description: "The purchase order was closed without receiving stock.",
      });
    } catch (error) {
      console.error("Error rejecting PO workflow:", error);
      toast({
        title: "Reject failed",
        description: "Could not reject this purchase order.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPoWorkflow(false);
    }
  };

  const handleSavePoSchedule = async () => {
    setIsSavingPoWorkflow(true);
    try {
      const handlingCharges = Number(poFinance.handlingCharges || 0);
      const freightCharges = Number(poFinance.freightCharges || 0);
      const existingShipping = (((currentOrder as any)?.shipping || {}) as any);
      const existingPayment = (((currentOrder as any)?.payment || {}) as any);
      const updatedShipping = sanitizeJsonObject({
        method: existingShipping.method || "FedEx",
        cost: Number(existingShipping.cost || currentOrder.shipping_cost || 0),
        trackingNumber: existingShipping.trackingNumber || "",
        estimatedDelivery: poFinance.expectedDelivery || "",
      });
      const updatedPayment = sanitizeJsonObject({
        method: poFinance.paymentMethod || "manual",
        notes: poFinance.financeNotes || "",
        includePricingInPdf: poFinance.includePricingInPdf !== false,
        date: existingPayment.date || "",
        reference: existingPayment.reference || "",
        payments: Array.isArray(existingPayment.payments) ? existingPayment.payments : [],
        documents: Array.isArray(existingPayment.documents) ? existingPayment.documents : [],
      });

      const { error } = await supabase
        .from("orders")
        .update({
          shipping_method: updatedShipping.method || null,
          tracking_number: updatedShipping.trackingNumber || null,
          estimated_delivery: updatedShipping.estimatedDelivery || null,
          receiving_notes: receivingNotes || null,
          payment_method: updatedPayment.method || "manual",
          payment_notes: updatedPayment.notes || null,
          po_handling_charges: Number.isFinite(handlingCharges) ? handlingCharges : 0,
          po_fred_charges: Number.isFinite(freightCharges) ? freightCharges : 0,
        })
        .eq("id", currentOrder.id);

      if (error) throw error;

      await syncPoChargeExpenses(freightCharges, handlingCharges);

      persistCurrentOrder({
        shipping: updatedShipping,
        receiving_notes: receivingNotes || "",
        payment: updatedPayment,
        shipping_method: updatedShipping.method || null,
        tracking_number: updatedShipping.trackingNumber || null,
        estimated_delivery: updatedShipping.estimatedDelivery || null,
        payment_method: updatedPayment.method || "manual",
        payment_notes: updatedPayment.notes || null,
        po_handling_charges: Number.isFinite(handlingCharges) ? handlingCharges : 0,
        po_fred_charges: Number.isFinite(freightCharges) ? freightCharges : 0,
      });

      toast({
        title: "Schedule saved",
        description: "Expected delivery and PO finance defaults were updated.",
      });
    } catch (error) {
      console.error("Error saving PO schedule:", error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Could not save delivery and finance settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPoWorkflow(false);
    }
  };

  const handleReceiveInventory = async () => {
    if (!poCanReceive) {
      toast({
        title: "Approve first",
        description: "Approve the purchase order before receiving inventory.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPoWorkflow(true);
    try {
      const updatedItems = (currentOrder.items || []).map((item: any, itemIndex: number) => {
        const nextSizes = (item.sizes || []).map((size: any, sizeIndex: number) => {
          const key = `${itemIndex}-${sizeIndex}`;
          const receiveNow = Number(receivingQuantities[key] || 0);
          const orderedQty = Number(size.quantity) || 0;
          const currentReceived = Number(size.received_quantity || 0);
          const remainingQty = Math.max(0, orderedQty - currentReceived);
          const safeReceiveQty = Math.max(0, Math.min(receiveNow, remainingQty));

          return {
            ...size,
            receive_now: safeReceiveQty,
            received_quantity: currentReceived + safeReceiveQty,
          };
        });

        return {
          ...item,
          sizes: nextSizes,
        };
      });

      const itemsToReceive = updatedItems.flatMap((item: any) => item.sizes || []).filter((size: any) => Number(size.receive_now) > 0);

      if (itemsToReceive.length === 0) {
        toast({
          title: "Nothing to receive",
          description: "Enter at least one quantity in the receiving step.",
          variant: "destructive",
        });
        return;
      }

      for (const size of itemsToReceive) {
        const currentSizeRes = await supabase
          .from("product_sizes")
          .select("stock, cost_price")
          .eq("id", size.id)
          .single();

        const currentSize = currentSizeRes.data as { stock: number; cost_price?: number } | null;
        if (currentSizeRes.error || !currentSize) continue;

        const receiveQty = Number(size.receive_now) || 0;
        const unitCost = Number(size.price) || 0;
        const newStock = (Number(currentSize.stock) || 0) + receiveQty;
        const currentCost = Number(currentSize.cost_price || unitCost || 0);
        const weightedCost = newStock > 0
          ? (((currentCost * (Number(currentSize.stock) || 0)) + (unitCost * receiveQty)) / newStock)
          : unitCost;

        await supabase
          .from("product_sizes")
          .update({
            stock: newStock,
            cost_price: Number(weightedCost.toFixed(2)),
          })
          .eq("id", size.id);
      }

      const totalReceivedAfterSave = updatedItems.reduce((sum: number, item: any) => {
        return sum + (item.sizes || []).reduce((sizeSum: number, size: any) => sizeSum + (Number(size.received_quantity) || 0), 0);
      }, 0);
      const totalOrdered = updatedItems.reduce((sum: number, item: any) => {
        return sum + (item.sizes || []).reduce((sizeSum: number, size: any) => sizeSum + (Number(size.quantity) || 0), 0);
      }, 0);

      const newStatus = totalReceivedAfterSave >= totalOrdered
        ? (String(currentOrder.payment_status || "").toLowerCase() === "paid" ? "closed" : "received")
        : "partially_received";
      const updatedShipping = {
        ...((currentOrder as any)?.shipping || {}),
        receivedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("orders")
        .update({
          items: updatedItems.map((item: any) => ({
            ...item,
            sizes: (item.sizes || []).map((size: any) => {
              const { receive_now, ...rest } = size;
              return rest;
            }),
          })),
          status: newStatus,
          estimated_delivery: (currentOrder as any)?.estimated_delivery || updatedShipping.estimatedDelivery || null,
          receiving_notes: receivingNotes || null,
        })
        .eq("id", currentOrder.id);

      if (error) throw error;

      await OrderActivityService.logActivity({
        orderId: currentOrder.id,
        activityType: "updated",
        description: `Inventory received for PO (${itemsToReceive.length} size lines processed)`,
        metadata: {
          received_units: itemsToReceive.reduce((sum: number, size: any) => sum + (Number(size.receive_now) || 0), 0),
          received_at: updatedShipping.receivedAt,
        },
      });

      persistCurrentOrder({
        items: updatedItems.map((item: any) => ({
          ...item,
          sizes: (item.sizes || []).map((size: any) => {
            const { receive_now, ...rest } = size;
            return rest;
          }),
        })),
        status: newStatus,
        shipping: updatedShipping,
        receiving_notes: receivingNotes || "",
      });

      toast({
        title: newStatus === "received" ? "PO fully received" : "Partial receipt saved",
        description: "Inventory and cost have been updated from the received quantities.",
      });
    } catch (error) {
      console.error("Error receiving PO inventory:", error);
      toast({
        title: "Receive failed",
        description: "Could not move received goods into inventory.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPoWorkflow(false);
    }
  };

  const handleRecordPoPayment = async () => {
    const paymentAmount = Number(poFinance.paymentAmount || 0);

    if (paymentAmount <= 0) {
      toast({
        title: "Invalid payment",
        description: "Enter a valid payment amount to record the vendor payment.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingPoWorkflow(true);
    try {
      const nextPaidAmount = Number(paidAmount || 0) + paymentAmount;
      const totalAmount = Number(currentOrder.total || currentOrder.total_amount || 0);
      const nextPaymentStatus = nextPaidAmount >= totalAmount ? "paid" : "partial";
      const nextOrderStatus =
        nextPaymentStatus === "paid" && String(currentOrder.status || "").toLowerCase() === "received"
          ? "closed"
          : currentOrder.status;
      const paymentEntry = {
        id: crypto.randomUUID(),
        amount: paymentAmount,
        date: poFinance.paymentDate || new Date().toISOString().slice(0, 10),
        method: poFinance.paymentMethod || "manual",
        reference: poFinance.paymentReference || "",
        note: poFinance.financeNotes || "",
        recorded_at: new Date().toISOString(),
      };
      const updatedPayment = {
        ...((currentOrder as any)?.payment || {}),
        method: poFinance.paymentMethod || "manual",
        date: paymentEntry.date,
        reference: poFinance.paymentReference || "",
        notes: poFinance.financeNotes || "",
        includePricingInPdf: poFinance.includePricingInPdf !== false,
        payments: [...poPaymentLedger, paymentEntry],
      };
      const expenseDescription = `COGS payment for purchase order ${currentOrder.order_number || currentOrder.id}${paymentEntry.reference ? ` | Ref ${paymentEntry.reference}` : ""}`;

      await syncPoExpenseEntry({
        amount: paymentAmount,
        category: "cost_of_goods_sold",
        sourceSubtype: `vendor_payment_${paymentEntry.id}`,
        name: `PO Payment ${currentOrder.order_number}`,
        description: expenseDescription,
        date: paymentEntry.date,
      });

      const { error: poPaymentError } = await supabase
        .from("po_payments" as any)
        .insert({
          order_id: currentOrder.id,
          amount: paymentAmount,
          payment_date: paymentEntry.date,
          payment_method: paymentEntry.method,
          reference: paymentEntry.reference || null,
          note: paymentEntry.note || null,
        });

      if (poPaymentError) throw poPaymentError;

      const { error } = await supabase
        .from("orders")
        .update({
          paid_amount: nextPaidAmount,
          payment_status: nextPaymentStatus,
          status: nextOrderStatus,
          payment_method: updatedPayment.method || "manual",
          payment_notes: updatedPayment.notes || null,
        })
        .eq("id", currentOrder.id);

      if (error) throw error;

      await OrderActivityService.logActivity({
        orderId: currentOrder.id,
        activityType: "payment_received",
        description: `Vendor payment recorded for PO and synced to expenses ($${paymentAmount.toFixed(2)})`,
        metadata: {
          payment_reference: updatedPayment.reference,
          payment_method: updatedPayment.method,
          expense_recorded: true,
        },
      });

      setPaidAmount(nextPaidAmount);
      setPoPayments((prev) => [
        {
          id: paymentEntry.id,
          amount: paymentAmount,
          payment_date: paymentEntry.date,
          payment_method: paymentEntry.method,
          reference: paymentEntry.reference || "",
          note: paymentEntry.note || "",
          created_at: paymentEntry.recorded_at,
        },
        ...prev,
      ]);
      persistCurrentOrder({
        paid_amount: nextPaidAmount,
        payment_status: nextPaymentStatus,
        status: nextOrderStatus,
        payment: updatedPayment,
        payment_method: updatedPayment.method || "manual",
        payment_notes: updatedPayment.notes || null,
      });
      setPoFinance((prev) => ({
        ...prev,
        paymentAmount: "",
        paymentReference: "",
        paymentDate: "",
      }));

      toast({
        title: "Payment recorded",
        description: "Vendor payment was saved and an expense entry was recorded.",
      });
    } catch (error) {
      console.error("Error recording PO payment:", error);
      toast({
        title: "Payment failed",
        description: "Could not record payment and expense for this PO.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPoWorkflow(false);
    }
  };

  const getExpenseCategoryBadgeClass = (category?: string | null) => {
    if (category === "cost_of_goods_sold") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  const getExpenseCategoryLabel = (category?: string | null) => {
    if (category === "cost_of_goods_sold") return "COGS";
    return "Other Expense";
  };

  const handleUploadPoDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Upload failed",
        description: "File size must be less than 10MB.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setIsUploadingPoDocument(true);
    try {
      const extension = file.name.split(".").pop() || "bin";
      const storagePath = `po-documents/${currentOrder.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("documents").getPublicUrl(storagePath);
      const nextDocument = {
        id: crypto.randomUUID(),
        name: file.name,
        file_path: storagePath,
        file_size: file.size,
        uploaded_at: new Date().toISOString(),
        url: publicUrlData.publicUrl,
      };
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("po_documents" as any).insert({
        order_id: currentOrder.id,
        uploaded_by: user?.id || null,
        name: file.name,
        file_path: storagePath,
        file_size: file.size,
        url: publicUrlData.publicUrl,
      });

      if (error) throw error;

      await loadPoDocuments();
      toast({
        title: "Document uploaded",
        description: "PO document was attached successfully.",
      });
    } catch (error) {
      console.error("Error uploading PO document:", error);
      toast({
        title: "Upload failed",
        description: "Could not attach the document to this purchase order.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPoDocument(false);
      event.target.value = "";
    }
  };

  const handleDeletePoDocument = async (documentId: string) => {
    const target = poDocuments.find((doc: any) => doc.id === documentId);
    if (!target) return;

    try {
      await supabase.storage.from("documents").remove([target.file_path]);
      const { error } = await supabase
        .from("po_documents" as any)
        .delete()
        .eq("id", documentId)
        .eq("order_id", currentOrder.id);

      if (error) throw error;

      setPoDocuments((prev) => prev.filter((doc: any) => doc.id !== documentId));
      toast({
        title: "Document removed",
        description: "The PO document was deleted.",
      });
    } catch (error) {
      console.error("Error deleting PO document:", error);
      toast({
        title: "Delete failed",
        description: "Could not remove this PO document.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPoDocument = async (document: any) => {
    try {
      const { data, error } = await supabase.storage
        .from("documents")
        .download(document.file_path);

      if (error) throw error;

      const blobUrl = window.URL.createObjectURL(data);
      const link = window.document.createElement("a");
      link.href = blobUrl;
      link.download = document.name || "po-document";
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error downloading PO document:", error);
      toast({
        title: "Download failed",
        description: "Could not download this PO document.",
        variant: "destructive",
      });
    }
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
            <SheetTitle className="text-base sm:text-lg md:text-xl">{poIs ? "Purchase Order Workspace" : "Order Details"}</SheetTitle>
            <SheetDescription className="text-xs sm:text-sm md:text-base">
              {isEditing ? "Edit order details" : poIs ? "Approve, schedule, receive, pay, and close the purchase order from one workspace" : "View and manage order information"}
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
                  onShipOrder={!poIs && onShipOrder ? () => handleStatusUpdate("ship") : undefined}
                  onPrint={handlePrint}
                  isGeneratingPDF={isGeneratingPDF}
                  isSendingEmail={loading}
                  userRole={userRole}
                  poIs={poIs}
                />

                {/* Tabs */}
                {poIs ? (
                  <Tabs value={activePoTab} onValueChange={setActivePoTab} className="w-full">
                    <TabsList className="w-full h-auto grid grid-cols-5 gap-1 mb-4 bg-muted/50 p-1 rounded-lg">
                      <TabsTrigger value="workspace" className="text-xs md:text-sm px-2 py-2">Workspace</TabsTrigger>
                      <TabsTrigger value="items" className="text-xs md:text-sm px-2 py-2">Items</TabsTrigger>
                      <TabsTrigger value="receiving" className="text-xs md:text-sm px-2 py-2">Receiving</TabsTrigger>
                      <TabsTrigger value="finance" className="text-xs md:text-sm px-2 py-2">Finance</TabsTrigger>
                      <TabsTrigger value="activity" className="text-xs md:text-sm px-2 py-2">Activity</TabsTrigger>
                    </TabsList>

                    <TabsContent value="workspace" className="mt-0 space-y-4">
                      <div className="grid gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-slate-500">
                            <PackageCheck className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-[0.18em]">Approval</span>
                          </div>
                          <p className="mt-3 text-2xl font-semibold text-slate-900">
                            {poWorkflowLabel}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">No inventory moves until receiving is posted.</p>
                        </div>
                        <div className="rounded-2xl border bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Truck className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-[0.18em]">Delivery</span>
                          </div>
                          <p className="mt-3 text-2xl font-semibold text-slate-900">{formatDateOnly(poFinance.expectedDelivery)}</p>
                          <p className="mt-1 text-sm text-slate-500">Expected inbound date for warehouse planning.</p>
                        </div>
                        <div className="rounded-2xl border bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Package className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-[0.18em]">Receiving</span>
                          </div>
                          <p className="mt-3 text-2xl font-semibold text-slate-900">{poReceivedUnits} / {poOrderedUnits}</p>
                          <p className="mt-1 text-sm text-slate-500">{poReceiveProgress}% received into inventory.</p>
                        </div>
                        <div className="rounded-2xl border bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Wallet className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-[0.18em]">Payable</span>
                          </div>
                          <p className="mt-3 text-2xl font-semibold text-slate-900">${poOutstandingAmount.toFixed(2)}</p>
                          <p className="mt-1 text-sm text-slate-500">Open amount after recorded PO payments.</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border bg-white p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">Process flow</h3>
                            <p className="text-sm text-slate-500">Approve vendor order, plan delivery, receive actual quantities, then record payment as expense.</p>
                          </div>
                          <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                            Status: {poWorkflowLabel}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-4">
                          <div className={`rounded-xl border p-3 ${Boolean((currentOrder as any).poApproved) ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">1. Approval</p>
                            <p className="mt-2 font-semibold text-slate-900">{Boolean((currentOrder as any).poApproved) ? "Completed" : "Waiting"}</p>
                          </div>
                          <div className={`rounded-xl border p-3 ${poFinance.expectedDelivery ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">2. Delivery plan</p>
                            <p className="mt-2 font-semibold text-slate-900">{poFinance.expectedDelivery ? formatDateOnly(poFinance.expectedDelivery) : "Set ETA"}</p>
                          </div>
                          <div className={`rounded-xl border p-3 ${poReceivedUnits > 0 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">3. Receiving</p>
                            <p className="mt-2 font-semibold text-slate-900">{poReceivedUnits === poOrderedUnits && poOrderedUnits > 0 ? "Fully received" : `${poOpenUnits} units open`}</p>
                          </div>
                          <div className={`rounded-xl border p-3 ${currentOrder.payment_status === "paid" ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">4. Finance close</p>
                            <p className="mt-2 font-semibold text-slate-900">{currentOrder.payment_status === "paid" ? "Expense posted" : "Payment pending"}</p>
                          </div>
                        </div>
                      </div>
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

                    <TabsContent value="receiving" className="mt-0 space-y-4">
                      <div className="rounded-2xl border bg-white p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">Receive into inventory</h3>
                            <p className="text-sm text-slate-500">Post actual received quantities. Only product unit cost updates inventory. Freight and handling stay outside inventory cost.</p>
                          </div>
                          <Badge variant="secondary">{poReceiveProgress}% received</Badge>
                        </div>
                        <div className="mt-4 space-y-3">
                          {(currentOrder.items || []).map((item: any, itemIndex: number) => (
                            <div key={`${item.productId || item.id || itemIndex}`} className="rounded-xl border bg-slate-50 p-3">
                              <div className="mb-3">
                                <p className="font-semibold text-slate-900">{item.name}</p>
                                <p className="text-xs text-slate-500">{item.sku || "No SKU"}{item.description ? ` • ${item.description}` : ""}</p>
                              </div>
                              <div className="space-y-2">
                                {(item.sizes || []).map((size: any, sizeIndex: number) => {
                                  const rowKey = `${itemIndex}-${sizeIndex}`;
                                  const orderedQty = Number(size.quantity) || 0;
                                  const receivedQty = Number(size.received_quantity || 0);
                                  const remainingQty = Math.max(0, orderedQty - receivedQty);
                                  return (
                                    <div key={rowKey} className="grid gap-3 rounded-lg border bg-white p-3 md:grid-cols-[minmax(0,1.4fr)_90px_90px_110px]">
                                      <div>
                                        <p className="font-medium text-slate-900">{size.size_value} {size.size_unit}</p>
                                        <p className="text-xs text-slate-500">
                                          {size.quantity_per_case ? `${size.quantity_per_case}/case` : "No case pack"}
                                          {size.sku ? ` • ${size.sku}` : ""}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ordered</p>
                                        <p className="mt-1 font-semibold text-slate-900">{orderedQty}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Received</p>
                                        <p className="mt-1 font-semibold text-slate-900">{receivedQty}</p>
                                      </div>
                                      <div>
                                        {remainingQty > 0 ? (
                                          <>
                                            <Label className="text-xs uppercase tracking-[0.18em] text-slate-500">Receive now</Label>
                                            <Input
                                              type="number"
                                              min={0}
                                              max={remainingQty}
                                              value={receivingQuantities[rowKey] ?? "0"}
                                              onChange={(e) => setReceivingQuantities((prev) => ({ ...prev, [rowKey]: e.target.value }))}
                                              className="mt-1"
                                              disabled={!poCanReceive || poFullyReceived}
                                            />
                                          </>
                                        ) : (
                                          <>
                                            <p className="text-xs uppercase tracking-[0.18em] text-emerald-600">Status</p>
                                            <p className="mt-1 font-semibold text-emerald-700">Fully received</p>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4">
                          <Label htmlFor="po-receiving-notes">Receiving notes</Label>
                          <Textarea
                            id="po-receiving-notes"
                            value={receivingNotes}
                            onChange={(e) => setReceivingNotes(e.target.value)}
                            placeholder="Record shortages, damaged cartons, backorders, or warehouse notes."
                            className="mt-2 min-h-[96px]"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="finance" className="mt-0 space-y-4">
                      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-2xl border bg-white p-4">
                          <h3 className="text-lg font-semibold text-slate-900">Delivery, charges, and payment defaults</h3>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <div>
                              <Label htmlFor="po-eta">Expected delivery</Label>
                              <Input id="po-eta" type="date" value={poFinance.expectedDelivery} onChange={(e) => setPoFinance((prev) => ({ ...prev, expectedDelivery: e.target.value }))} className="mt-2" disabled={isPoFullyPaid} />
                            </div>
                            <div>
                              <Label htmlFor="po-payment-method">Payment method</Label>
                              <Input id="po-payment-method" value={poFinance.paymentMethod} onChange={(e) => setPoFinance((prev) => ({ ...prev, paymentMethod: e.target.value }))} className="mt-2" placeholder="ACH, check, wire, card" disabled={isPoFullyPaid} />
                            </div>
                            <div>
                              <Label htmlFor="po-freight">Freight charges</Label>
                              <Input id="po-freight" type="number" min={0} step="0.01" value={poFinance.freightCharges} onChange={(e) => setPoFinance((prev) => ({ ...prev, freightCharges: e.target.value }))} className="mt-2" disabled={isPoFullyPaid} />
                            </div>
                            <div>
                              <Label htmlFor="po-handling">Handling charges</Label>
                              <Input id="po-handling" type="number" min={0} step="0.01" value={poFinance.handlingCharges} onChange={(e) => setPoFinance((prev) => ({ ...prev, handlingCharges: e.target.value }))} className="mt-2" disabled={isPoFullyPaid} />
                            </div>
                          </div>
                          <div className="mt-4">
                            <Label htmlFor="po-finance-notes">Planning notes</Label>
                            <Textarea id="po-finance-notes" value={poFinance.financeNotes} onChange={(e) => setPoFinance((prev) => ({ ...prev, financeNotes: e.target.value }))} className="mt-2 min-h-[96px]" placeholder="Terms, delivery windows, vendor promises, or internal approvals." disabled={isPoFullyPaid} />
                          </div>
                          {isPoFullyPaid ? (
                            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                              Freight, handling, delivery, and payment-default inputs are locked because this PO is already 100% paid.
                            </div>
                          ) : null}
                          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                            Vendor payments are posted as <span className="font-medium text-slate-900">COGS</span>. Freight and handling are posted as <span className="font-medium text-slate-900">Other Expense</span> and do not change inventory weighted cost.
                          </div>
                          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <Label htmlFor="po-pricing-pdf" className="text-sm font-medium text-slate-900">Include pricing on PO PDF</Label>
                                <p className="mt-1 text-sm text-slate-500">
                                  Use quantity-only PDF when the vendor should not see purchase pricing on the document.
                                </p>
                              </div>
                              <Switch
                                id="po-pricing-pdf"
                                checked={poFinance.includePricingInPdf !== false}
                                onCheckedChange={(checked) => setPoFinance((prev) => ({ ...prev, includePricingInPdf: Boolean(checked) }))}
                              />
                            </div>
                          </div>
                          <div className=" flex flex-col gap-6 mt-6">
                            {/* PO documents */}
                            <div className="rounded-2xl border bg-white p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <h3 className="text-lg font-semibold text-slate-900">PO documents</h3>
                                  <p className="text-sm text-slate-500">Attach invoices, receiving slips, vendor confirmations, or payment proof.</p>
                                </div>
                                <Label htmlFor="po-document-upload" className="cursor-pointer rounded-md border px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                                  {isUploadingPoDocument ? "Uploading..." : "Upload"}
                                </Label>
                                <Input id="po-document-upload" type="file" className="hidden" onChange={handleUploadPoDocument} disabled={isUploadingPoDocument} />
                              </div>
                              <div className="mt-4 space-y-2">
                                {poDocuments.length > 0 ? (
                                  poDocuments.slice().reverse().map((doc: any) => (
                                    <div key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border bg-slate-50 p-3 text-sm">
                                      <div className="min-w-0">
                                        <p className="truncate font-medium text-slate-900">{doc.name}</p>
                                        <p className="text-slate-500">{formatDateOnly(doc.uploaded_at)}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDownloadPoDocument(doc)}
                                          aria-label={`Download ${doc.name}`}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={() => handleDeletePoDocument(doc.id)}>
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">No documents attached to this PO yet.</div>
                                )}
                              </div>
                            </div>
                            {/* Payment history */}
                            <div className="rounded-2xl border bg-white p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <h3 className="text-lg font-semibold text-slate-900">Payment history</h3>
                                  <p className="text-sm text-slate-500">See exactly when each payment was done and how much was still pending after it.</p>
                                </div>
                              </div>
                              <div className="mt-4 space-y-2">
                                {poPaymentHistory.length > 0 ? (
                                  poPaymentHistory.slice().reverse().map((entry: any) => (
                                    <div key={entry.id} className="rounded-xl border bg-slate-50 p-3 text-sm">
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="font-medium text-slate-900">${Number(entry.amount || 0).toFixed(2)}</span>
                                        <span className="text-slate-500">{formatDateOnly(entry.date)}</span>
                                      </div>
                                      <div className="mt-1 text-slate-500">
                                        {entry.method || "manual"}{entry.reference ? ` • ${entry.reference}` : ""}
                                      </div>
                                      <div className="mt-2">
                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getExpenseCategoryBadgeClass("cost_of_goods_sold")}`}>
                                          {getExpenseCategoryLabel("cost_of_goods_sold")}
                                        </span>
                                      </div>
                                      <div className="mt-2 grid gap-2 sm:grid-cols-2 text-xs">
                                        <div className="rounded-md border bg-white px-2 py-2">
                                          <span className="text-slate-500">Paid after this payment</span>
                                          <div className="font-medium text-slate-900">${Number(entry.paidAfter || 0).toFixed(2)}</div>
                                        </div>
                                        <div className="rounded-md border bg-white px-2 py-2">
                                          <span className="text-slate-500">Pending after this payment</span>
                                          <div className="font-medium text-amber-700">${Number(entry.pendingAfter || 0).toFixed(2)}</div>
                                        </div>
                                      </div>
                                      {entry.note ? <div className="mt-1 text-slate-500">{entry.note}</div> : null}
                                    </div>
                                  ))
                                ) : (
                                  <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">No payment recorded yet.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border bg-slate-50 p-4">
                          <h3 className="text-lg font-semibold text-slate-900">Vendor payment tracker</h3>
                          <p className="mt-1 text-sm text-slate-500">
                            Track what is already paid, what this payment will cover, and what will still be pending.
                          </p>
                          <div className="mt-4 grid gap-4">
                            <div>
                              <Label htmlFor="po-payment-date">Payment date</Label>
                              <Input id="po-payment-date" type="date" value={poFinance.paymentDate} onChange={(e) => setPoFinance((prev) => ({ ...prev, paymentDate: e.target.value }))} className="mt-2" disabled={isPoFullyPaid} />
                            </div>
                            <div>
                              <Label htmlFor="po-payment-reference">Reference</Label>
                              <Input id="po-payment-reference" value={poFinance.paymentReference} onChange={(e) => setPoFinance((prev) => ({ ...prev, paymentReference: e.target.value }))} className="mt-2" placeholder="Check no, ACH trace, wire ref" disabled={isPoFullyPaid} />
                            </div>
                            <div>
                              <Label htmlFor="po-payment-amount">Record payment now</Label>
                              <Input id="po-payment-amount" type="number" min={0} step="0.01" value={poFinance.paymentAmount} onChange={(e) => setPoFinance((prev) => ({ ...prev, paymentAmount: e.target.value }))} className="mt-2" placeholder="Enter this payment amount" disabled={isPoFullyPaid} />
                            </div>
                            {isPoFullyPaid ? (
                              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                                Vendor payment is complete. Payment date, reference, and payment amount are locked because nothing is pending.
                              </div>
                            ) : null}
                            <div className="rounded-xl border bg-white p-4 text-sm shadow-sm">
                              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Outstanding to vendor</p>
                                    <p className="mt-1 text-3xl font-semibold text-slate-900">${poOutstandingAmount.toFixed(2)}</p>
                                  </div>
                                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-700 shadow-sm">
                                    {poPaidPercent}% paid
                                  </span>
                                </div>
                                <p className="mt-2 text-xs text-amber-800">
                                  This is the amount still pending right now.
                                </p>
                              </div>

                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                <div className="rounded-lg border bg-slate-50 p-3">
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Paid so far</p>
                                  <p className="mt-1 text-2xl font-semibold text-emerald-600">${paidAmount.toFixed(2)}</p>
                                  <p className="mt-1 text-xs text-slate-500">Already posted to vendor</p>
                                </div>
                                <div className="rounded-lg border bg-slate-50 p-3">
                                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Recording now</p>
                                  <p className="mt-1 text-2xl font-semibold text-slate-900">${poPaymentDraftAmount.toFixed(2)}</p>
                                  <p className="mt-1 text-xs text-slate-500">Will save when you click `Pay + Expense`</p>
                                </div>
                              </div>

                              <div className="mt-4">
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span>Current payment progress</span>
                                  <span>{poPaidPercent}% paid</span>
                                </div>
                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${poPaidPercent}%` }} />
                                </div>
                              </div>

                              {poPaymentDraftAmount > 0 ? (
                                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-slate-900">After this payment</span>
                                    <span className="font-semibold text-blue-700">{poPaidPercentAfterDraft}% paid</span>
                                  </div>
                                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                                    <div className="rounded-md bg-white/80 px-3 py-2">
                                      <div className="text-xs text-slate-500">Total paid after save</div>
                                      <div className="font-semibold text-slate-900">${poAppliedAfterDraft.toFixed(2)}</div>
                                    </div>
                                    <div className="rounded-md bg-white/80 px-3 py-2">
                                      <div className="text-xs text-slate-500">Still pending after save</div>
                                      <div className="font-semibold text-blue-700">${poPendingAfterDraft.toFixed(2)}</div>
                                    </div>
                                  </div>
                                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
                                    <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${poPaidPercentAfterDraft}%` }} />
                                  </div>
                                </div>
                              ) : null}

                              <div className="mt-4 rounded-lg border bg-slate-50 p-3">
                                <div className="mb-3 flex items-center justify-between">
                                  <span className="text-sm font-medium text-slate-900">PO cost breakdown</span>
                                  <span className="text-xs text-slate-500">Current totals</span>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between"><span className="text-slate-500">Merchandise subtotal</span><span className="font-medium">${poSubtotal.toFixed(2)}</span></div>
                                  <div className="flex items-center justify-between"><span className="text-slate-500">Freight + handling</span><span className="font-medium">${poChargesTotal.toFixed(2)}</span></div>
                                  <div className="flex items-center justify-between"><span className="text-slate-500">Total PO cost</span><span className="font-medium">${poLandedCostAmount.toFixed(2)}</span></div>
                                  <div className="flex items-center justify-between"><span className="text-slate-500">Paid to vendor</span><span className="font-medium">${paidAmount.toFixed(2)}</span></div>
                                  <div className="border-t pt-3 flex items-center justify-between"><span className="font-semibold text-slate-900">Outstanding</span><span className="font-semibold text-slate-900">${poOutstandingAmount.toFixed(2)}</span></div>
                                </div>
                              </div>
                              <p className="mt-3 text-xs leading-5 text-slate-500">Vendor payments post to COGS. Freight and handling post to Other Expense.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">

                      </div>
                    </TabsContent>

                    <TabsContent value="activity" className="mt-0">
                      <ActivityTab order={currentOrder} />
                    </TabsContent>
                  </Tabs>
                ) : (
                  <Tabs key={currentOrder.id} defaultValue="overview" className="w-full">
                    <TabsList className="w-full h-auto flex sm:grid sm:grid-cols-6 gap-1 mb-4 bg-muted/50 p-1 rounded-lg overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/30">
                      <TabsTrigger value="overview" className="text-[11px] sm:text-xs md:text-sm flex-1 sm:flex-none px-2 py-1.5 whitespace-nowrap">
                        Overview
                      </TabsTrigger>
                      <TabsTrigger value="items" className="text-[11px] sm:text-xs md:text-sm flex-1 sm:flex-none px-2 py-1.5 whitespace-nowrap">
                        Items
                      </TabsTrigger>
                      <TabsTrigger value="customer" className="text-[11px] sm:text-xs md:text-sm flex-1 sm:flex-none px-2 py-1.5 whitespace-nowrap">
                        Customer
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
                )}

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
            <div className="flex flex-col gap-3 pt-3 border-t border-gray-200 bg-white">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className={getPoWorkflowBadgeClass(poWorkflowState)}>
                    {poWorkflowLabel}
                  </Badge>
                  <Badge variant="outline">{currentOrder.payment_status || "unpaid"}</Badge>
                  <Badge variant="outline">{currentOrder.status || "new"}</Badge>
                </div>
                <div className="text-sm text-slate-500">
                  Ordered {poOrderedUnits} units • Received {poReceivedUnits} • Open {poOpenUnits}
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                <Button
                  onClick={handleApproveWorkflow}
                  disabled={Boolean((currentOrder as any).poApproved) || Boolean((currentOrder as any).poRejected) || isSavingPoWorkflow}
                  className="w-full justify-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle size={16} />
                  Approve PO
                </Button>
                <Button
                  onClick={handleSavePoSchedule}
                  disabled={isSavingPoWorkflow}
                  variant="outline"
                  className="w-full justify-center gap-2"
                >
                  <CalendarClock size={16} />
                  Save Schedule
                </Button>
                <Button
                  onClick={handleReceiveInventory}
                  disabled={!poCanReceive || isSavingPoWorkflow || poFullyReceived}
                  variant="outline"
                  className="w-full justify-center gap-2"
                >
                  <PackageCheck size={16} />
                  Receive Stock
                </Button>
                <Button
                  onClick={handleRecordPoPayment}
                  disabled={isSavingPoWorkflow || !poCanRecordPayment}
                  variant="outline"
                  className="w-full justify-center gap-2"
                >
                  <ReceiptText size={16} />
                  Pay + Expense
                </Button>
                <Button
                  onClick={handleRejectWorkflow}
                  disabled={!poCanReject}
                  variant="destructive"
                  className="w-full justify-center gap-2"
                >
                  <XCircle size={16} />
                  Reject PO
                </Button>
              </div>
            </div>
          )}
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
