import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Package, DollarSign, MapPin, Truck, Calendar, 
  FileText, CreditCard, Phone, Mail, Download,
  Clock, CheckCircle, XCircle, AlertCircle, Copy, 
  Printer, ArrowLeft, Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/supabaseClient";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { OrderActivityTimeline } from "@/components/orders/OrderActivityTimeline";
import jsPDF from "jspdf";
import "jspdf-autotable";
import JsBarcode from "jsbarcode";
import Logo from '../../assests/home/9rx_logo.png';

interface OrderItem {
  name: string;
  description?: string;
  sizes: {
    size_value: string;
    size_unit: string;
    quantity: number;
    price: number;
  }[];
}

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  created_at: string;
  total_amount: number;
  shipping_cost: number;
  tax_amount: number;
  paid_amount: number;
  items: OrderItem[];
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: any;
  invoice_number?: string;
  discount_amount?: number;
  discount_details?: any[];
  profile_id?: string;
  payment_transication?: string;
}

// Helper function to get address fields
const getAddressField = (
  shippingAddress: any,
  type: "billing" | "shipping",
  field: string
): string => {
  if (!shippingAddress) return "";
  const addressObj = shippingAddress[type];
  if (addressObj && typeof addressObj === 'object') {
    const value = (addressObj as Record<string, string>)[field];
    if (value) return value;
  }
  if (shippingAddress.address && typeof shippingAddress.address === 'object') {
    const legacyAddress = shippingAddress.address as Record<string, string>;
    return legacyAddress[field] || "";
  }
  return "";
};

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (error) throw error;
        
        setOrder(data);

        // Fetch company name
        if (data?.profile_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("company_name")
            .eq("id", data.profile_id)
            .maybeSingle();
          if (profileData) setCompanyName(profileData.company_name || "");
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        toast({
          title: "Error",
          description: "Failed to load order details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, toast]);

  // Calculate totals
  const subtotal = order?.items?.reduce((total, item) => {
    return total + item.sizes.reduce((sum, size) => sum + size.quantity * size.price, 0);
  }, 0) || 0;
  const shipping = Number(order?.shipping_cost || 0);
  const tax = Number(order?.tax_amount || 0);
  const discountAmount = Number(order?.discount_amount || 0);
  const total = subtotal + shipping + tax - discountAmount;
  const paidAmount = Number(order?.paid_amount || 0);
  const balanceDue = Math.max(0, total - paidAmount);

  // Count totals
  const totalLineItems = order?.items?.reduce(
    (total, item) => total + (item.sizes?.length || 0), 0
  ) || 0;
  const totalUnits = order?.items?.reduce(
    (total, item) => total + item.sizes.reduce((sum, size) => sum + size.quantity, 0), 0
  ) || 0;

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle, label: "Delivered" };
      case "shipped":
        return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Truck, label: "Shipped" };
      case "processing":
        return { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, label: "Processing" };
      case "cancelled":
        return { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, label: "Cancelled" };
      default:
        return { color: "bg-gray-100 text-gray-700 border-gray-200", icon: AlertCircle, label: status || "Pending" };
    }
  };

  const copyOrderNumber = () => {
    if (order?.order_number) {
      navigator.clipboard.writeText(order.order_number);
      toast({ title: "Copied!", description: "Order number copied to clipboard" });
    }
  };

  // Generate barcode
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

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!order) return;
    setIsGeneratingPDF(true);
    
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const brandColor: [number, number, number] = [59, 130, 246];
      const darkGray: [number, number, number] = [60, 60, 60];
      const lightGray: [number, number, number] = [245, 245, 245];

      // Small blue line at top
      doc.setFillColor(...brandColor);
      doc.rect(0, 0, pageWidth, 3, "F");

      // Try to add logo first
      let logoLoaded = false;
      let logoHeight = 0;
      try {
        const logo = new Image();
        logo.src = Logo;
        await new Promise<void>((resolve) => {
          logo.onload = () => { logoLoaded = true; resolve(); };
          logo.onerror = () => resolve();
          setTimeout(() => resolve(), 3000);
        });
        if (logoLoaded && logo.width > 0) {
          logoHeight = 18;
          const logoWidth = (logo.width / logo.height) * logoHeight;
          doc.addImage(logo, "PNG", margin, 8, logoWidth, logoHeight);
        }
      } catch { /* Continue without logo */ }

      // Company info - positioned below the logo in a column layout
      const companyTextY = logoLoaded ? 8 + logoHeight + 5 : 16; // Start below logo with 5mm gap
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...darkGray);
      doc.text("9RX LLC", margin, companyTextY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text("936 Broad River Ln, Charlotte, NC 28211", margin, companyTextY + 6);
      doc.text("Phone: +1 800 969 6295  |  Email: info@9rx.com", margin, companyTextY + 11);

      // Document title
      const invoiceNumber = order.invoice_number;
      const isNewOrder = order.status === "new" || order.status === "pending";
      const documentTitle = invoiceNumber && !isNewOrder ? "INVOICE" : "SALES ORDER";
      const documentNumber = invoiceNumber && !isNewOrder ? invoiceNumber : order.order_number || "";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(...brandColor);
      doc.text(documentTitle, pageWidth - margin, 16, { align: "right" });
      doc.setFontSize(10);
      doc.setTextColor(...darkGray);
      doc.text(`# ${documentNumber}`, pageWidth - margin, 24, { align: "right" });

      const formattedDate = new Date(order.created_at).toLocaleDateString("en-US", {
        year: "numeric", month: "2-digit", day: "2-digit"
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${formattedDate}`, pageWidth - margin, 30, { align: "right" });

      // Payment status badge
      const badgeY = 34;
      if (order.payment_status === "paid") {
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

      // Barcode
      try {
        const barcodeDataUrl = generateBarcode(documentNumber);
        doc.addImage(barcodeDataUrl, "PNG", pageWidth - margin - 50, badgeY + 10, 50, 12);
      } catch { /* Skip barcode */ }

      // Divider
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(margin, 65, pageWidth - margin, 65);

      // Items table
      const tableStartY = 72;
      const tableHead = [["#", "Description", "Size", "Qty", "Unit Price", "Total"]];
      const tableBody: any[] = [];
      let itemIndex = 1;
      
      order.items?.forEach((item) => {
        item.sizes.forEach((size) => {
          tableBody.push([
            itemIndex.toString(),
            item.name,
            `${size.size_value} ${size.size_unit}`,
            size.quantity.toString(),
            `$${Number(size.price).toFixed(2)}`,
            `$${(size.quantity * size.price).toFixed(2)}`
          ]);
          itemIndex++;
        });
      });

      (doc as any).autoTable({
        head: tableHead,
        body: tableBody,
        startY: tableStartY,
        styles: { fontSize: 9, cellPadding: 3 },
        theme: "striped",
        headStyles: { fillColor: brandColor, textColor: 255, fontStyle: "bold", halign: "center" },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { cellWidth: "auto" },
          2: { halign: "center", cellWidth: 25 },
          3: { halign: "center", cellWidth: 15 },
          4: { halign: "right", cellWidth: 25 },
          5: { halign: "right", cellWidth: 25 },
        },
        margin: { left: margin, right: margin },
      });

      let finalY = (doc as any).lastAutoTable.finalY + 10;

      // Summary
      const summaryBody = [
        ["Subtotal", `$${subtotal.toFixed(2)}`],
        ["Shipping", `$${shipping.toFixed(2)}`],
        ["Tax", `$${tax.toFixed(2)}`],
      ];
      if (discountAmount > 0) {
        summaryBody.push(["Discount", `-$${discountAmount.toFixed(2)}`]);
      }

      (doc as any).autoTable({
        body: summaryBody,
        startY: finalY,
        theme: "plain",
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { halign: "right", cellWidth: 45 },
          1: { halign: "right", cellWidth: 35 },
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

      // Footer band and page numbers
      const totalPages = (doc as any).internal.getNumberOfPages();
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();
      
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        
        // Green footer band at bottom
        doc.setFillColor(...brandColor);
        doc.rect(0, pdfHeight - 2, pdfWidth, 2, "F");
        
        // White background for page number
        doc.setFillColor(255, 255, 255);
        doc.rect(pdfWidth / 2 - 20, pdfHeight - 9, 40, 6, "F");
        
        // Page number text
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        doc.text(`Page ${i} of ${totalPages}`, pdfWidth / 2, pdfHeight - 5, { align: "center" });
      }

      doc.save(`${order.order_number || 'order'}.pdf`);
      toast({ title: "Success", description: "Invoice downloaded successfully" });
    } catch (error) {
      console.error("PDF Error:", error);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="pharmacy">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout role="pharmacy">
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Package className="h-16 w-16 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-700">Order not found</h2>
          <Button onClick={() => navigate("/pharmacy/orders")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <DashboardLayout role="pharmacy">
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/pharmacy/orders")}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  Order #{order.order_number || order.id.slice(0, 8)}
                </h1>
                <Button variant="ghost" size="sm" onClick={copyOrderNumber}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-gray-500 mt-1">
                {new Date(order.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download PDF
            </Button>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-3">
          <Badge className={`${statusInfo.color} px-3 py-1 text-sm font-medium`}>
            <StatusIcon className="w-4 h-4 mr-1" />
            {statusInfo.label}
          </Badge>
          <Badge 
            className={`px-3 py-1 text-sm font-medium ${
              order.payment_status === "paid" 
                ? "bg-green-100 text-green-700 border-green-200" 
                : "bg-red-100 text-red-700 border-red-200"
            }`}
          >
            <CreditCard className="w-4 h-4 mr-1" />
            {order.payment_status === "paid" ? "Paid" : "Unpaid"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" />
                  Order Items ({totalLineItems} items, {totalUnits} units)
                </h3>
                <div className="space-y-4">
                  {order.items?.map((item, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                      )}
                      <div className="mt-3 space-y-2">
                        {item.sizes.map((size, sizeIdx) => (
                          <div key={sizeIdx} className="flex justify-between items-center text-sm bg-gray-50 rounded px-3 py-2">
                            <span className="text-gray-600">
                              {size.size_value} {size.size_unit} × {size.quantity}
                            </span>
                            <span className="font-medium text-gray-900">
                              ${(size.quantity * size.price).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Activity Timeline */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Order Activity
                </h3>
                <OrderActivityTimeline orderId={order.id} />
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  Order Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">${shipping.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">${tax.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span className="font-medium">-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-blue-600">${total.toFixed(2)}</span>
                  </div>
                  {paidAmount > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Paid Amount</span>
                        <span className="font-medium">${paidAmount.toFixed(2)}</span>
                      </div>
                      {balanceDue > 0 && (
                        <div className="flex justify-between text-sm text-red-600">
                          <span>Balance Due</span>
                          <span className="font-medium">${balanceDue.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            {order.shipping_address && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Shipping Address
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    {companyName && <p className="font-medium text-gray-900">{companyName}</p>}
                    <p>{getAddressField(order.shipping_address, "shipping", "street1")}</p>
                    <p>
                      {getAddressField(order.shipping_address, "shipping", "city")}, {" "}
                      {getAddressField(order.shipping_address, "shipping", "state")} {" "}
                      {getAddressField(order.shipping_address, "shipping", "zipCode")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Info */}
            {(order.customer_email || order.customer_phone) && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-blue-600" />
                    Contact Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    {order.customer_name && (
                      <p className="font-medium text-gray-900">{order.customer_name}</p>
                    )}
                    {order.customer_email && (
                      <p className="text-gray-600 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {order.customer_email}
                      </p>
                    )}
                    {order.customer_phone && (
                      <p className="text-gray-600 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {order.customer_phone}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
