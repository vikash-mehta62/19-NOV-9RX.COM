"use client"

import { useEffect, useRef, useState } from "react"
import jsPDF from "jspdf"
import { SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { defaultValues } from "@/components/settings/settingsTypes"
import type { SettingsFormValues } from "@/components/settings/settingsTypes"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { 
  Building, MapPin, Phone, Mail, Globe, Download, 
  FileText, CheckCircle, XCircle, CreditCard, Hash,
  User, Truck, Package, Calendar, Loader2
} from "lucide-react";
import JsBarcode from "jsbarcode";

interface Address {
  street: string
  city: string
  state: string
  zip_code: string
}

interface InvoicePreviewProps {
  invoice?: {
    id: string
    profile_id: string
    invoice_number: any
    order_number: any
    customerInfo?: {
      name: string
      phone: string
      email: string
      address: Address
    }
    shippingInfo?: {
      fullName: string
      phone: string
      email: string
      address: Address
    }
    items?: Array<{
      name: string
      description: string
      quantity: number
      price: number
      sizes: any[]
      amount: number
      productId?: string
    }>
    subtotal?: number
    shippin_cost?: string
    tax?: number
    total?: number
    payment_status: string,
    payment_method: string,
    payment_notes: string,
    created_at: string,
    payment_transication: string,
  }
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const { toast } = useToast()
  const settings: SettingsFormValues = defaultValues
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [companyName, setCompanyName] = useState("")

  if (!invoice) {
    return (
      <SheetContent className="w-full sm:max-w-[600px] md:max-w-[700px] overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">No invoice data available</p>
        </div>
      </SheetContent>
    )
  }

  const fetchUser = async () => {
    try {
      if (!invoice || !invoice.profile_id) return

      const { data, error } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("id", invoice.profile_id)
        .maybeSingle();

      if (error) {
        console.error("Supabase Fetch Error:", error);
        return;
      }

      if (data) {
        setCompanyName(data.company_name || "")
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  useEffect(() => {
    fetchUser()
  }, [invoice])

  const formattedDate = new Date(invoice.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });

  const isPaid = invoice?.payment_status === "paid";
  const subtotalAmount = (invoice?.subtotal || 0) - (invoice?.tax || 0) - Number(invoice?.shippin_cost || 0);

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;

      // Add Logo
      const logo = new Image();
      logo.src = "/final.png";
      await new Promise((resolve) => (logo.onload = resolve));
      const logoHeight = 23;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      doc.addImage(logo, "PNG", pageWidth / 2 - logoWidth / 2, margin, logoWidth, logoHeight);

      // Top Info
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const topInfo = [
        "Tax ID : 99-0540972",
        "936 Broad River Ln, Charlotte, NC 28211",
        "info@9rx.com",
        "www.9rx.com"
      ].join("     |     ");
      doc.text(topInfo, pageWidth / 2, margin - 2, { align: "center" });

      // Phone number
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("+1 (800) 969-6295", margin, margin + 10);

      // Invoice title
      doc.text("INVOICE", pageWidth - margin, margin + 10, { align: "right" });

      doc.setFontSize(10);
      doc.text(`ORDER - ${invoice.order_number}`, pageWidth - margin, margin + 15, { align: "right" });
      doc.text(`INVOICE - ${invoice.invoice_number}`, pageWidth - margin, margin + 20, { align: "right" });
      doc.text(`Date - ${formattedDate}`, pageWidth - margin, margin + 25, { align: "right" });

      // Divider
      doc.setDrawColor(200);
      doc.line(margin, margin + 29, pageWidth - margin, margin + 29);

      // Bill To / Ship To
      const infoStartY = margin + 37;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Bill To", margin, infoStartY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(companyName, margin, infoStartY + 5);
      doc.text(invoice.customerInfo?.name || "N/A", margin, infoStartY + 10);
      doc.text(invoice.customerInfo?.phone || "N/A", margin, infoStartY + 15);
      doc.text(invoice.customerInfo?.email || "N/A", margin, infoStartY + 20);
      doc.text(
        `${invoice.customerInfo?.address?.street || "N/A"}, ${invoice.customerInfo?.address?.city || "N/A"}, ${invoice.customerInfo?.address?.state || "N/A"} ${invoice.customerInfo?.address?.zip_code || "N/A"}`,
        margin,
        infoStartY + 25,
        { maxWidth: contentWidth / 2 - 5 },
      );

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Ship To", pageWidth / 2, infoStartY);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(companyName, pageWidth / 2, infoStartY + 5);
      doc.text(invoice.shippingInfo?.fullName || "N/A", pageWidth / 2, infoStartY + 10);
      doc.text(invoice.shippingInfo?.phone || "N/A", pageWidth / 2, infoStartY + 15);
      doc.text(invoice.shippingInfo?.email || "N/A", pageWidth / 2, infoStartY + 20);
      doc.text(
        `${invoice.shippingInfo?.address?.street || "N/A"}, ${invoice.shippingInfo?.address?.city || "N/A"}, ${invoice.shippingInfo?.address?.state || "N/A"} ${invoice.shippingInfo?.address?.zip_code || "N/A"}`,
        pageWidth / 2,
        infoStartY + 25,
        { maxWidth: contentWidth / 2 - 5 },
      );

      doc.line(margin, infoStartY + 35, pageWidth - margin, infoStartY + 35);

      // Items table
      const tableStartY = infoStartY + 45;
      const tableHead = [["ITEMS", "DESCRIPTION", "QUANTITY", "UNIT PRICE", "TOTAL"]];
      const tableBody: any[] = [];

      if (invoice?.items && Array.isArray(invoice.items)) {
        invoice.items.forEach((item) => {
          tableBody.push([{
            content: item.name,
            colSpan: 5,
            styles: { fontStyle: 'bold', halign: 'left', fillColor: [245, 245, 245], textColor: [0, 0, 0] }
          }]);

          if (Array.isArray(item.sizes)) {
            item.sizes.forEach((size) => {
              tableBody.push([
                size.sku || "N/A",
                `${size.size_value} ${size.size_unit}`,
                size.quantity?.toString() || '0',
                `$${Number(size.price).toFixed(2)}`,
                `$${Number(size.price * size.quantity).toFixed(2)}`
              ]);
            });
          }
        });
      }

      (doc as any).autoTable({
        head: tableHead,
        body: tableBody,
        startY: tableStartY,
        theme: "grid",
        headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: "bold" },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 'auto' },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right" },
        },
        margin: { left: margin, right: margin },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      const paymentStatusX = margin;
      const paymentStatusWidth = contentWidth / 3;
      const summaryWidth = contentWidth * 0.45;
      const summaryX = pageWidth - margin - summaryWidth;

      // Payment status box
      doc.setFillColor(240, 240, 240);
      doc.rect(paymentStatusX, finalY, paymentStatusWidth, 40, "F");
      doc.setDrawColor(200, 200, 200);
      doc.rect(paymentStatusX, finalY, paymentStatusWidth, 40, "S");

      if (isPaid) {
        doc.setFillColor(39, 174, 96);
      } else {
        doc.setFillColor(231, 76, 60);
      }
      doc.setTextColor(255, 255, 255);
      doc.roundedRect(paymentStatusX + 5, finalY + 5, 50, 10, 5, 5, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(isPaid ? "Paid" : "Unpaid", paymentStatusX + 10, finalY + 11);

      if (isPaid) {
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text(
          invoice.payment_method === "card" ? "Transaction ID:" : "Payment Notes:",
          paymentStatusX + 5,
          finalY + 25,
        );
        doc.setFont("helvetica", "normal");
        doc.text(
          invoice.payment_method === "card" ? invoice?.payment_transication : invoice?.payment_notes,
          paymentStatusX + 5,
          finalY + 30,
          { maxWidth: paymentStatusWidth - 10 },
        );
      }

      // Summary box
      doc.setFillColor(255, 255, 255);
      doc.setTextColor(0, 0, 0);
      doc.rect(summaryX, finalY, summaryWidth, 40, "F");
      doc.setDrawColor(200, 200, 200);
      doc.rect(summaryX, finalY, summaryWidth, 40, "S");

      const summaryLeftX = summaryX + 5;
      const summaryRightX = summaryX + summaryWidth - 5;
      let summaryY = finalY + 10;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("Sub Total", summaryLeftX, summaryY);
      doc.text(`$${subtotalAmount.toFixed(2)}`, summaryRightX, summaryY, { align: "right" });

      summaryY += 5;
      doc.text("Tax", summaryLeftX, summaryY);
      doc.text(`$${(invoice?.tax || 0).toFixed(2)}`, summaryRightX, summaryY, { align: "right" });

      summaryY += 5;
      doc.text("Shipping", summaryLeftX, summaryY);
      doc.text(`$${Number(invoice?.shippin_cost || 0).toFixed(2)}`, summaryRightX, summaryY, { align: "right" });

      summaryY += 3;
      doc.line(summaryLeftX, summaryY, summaryRightX, summaryY);

      summaryY += 5;
      doc.setFont("helvetica", "bold");
      doc.text("Total", summaryLeftX, summaryY);
      doc.text(`$${(invoice?.total || 0).toFixed(2)}`, summaryRightX, summaryY, { align: "right" });

      summaryY += 5;
      doc.setTextColor(231, 76, 60);
      doc.text("Balance Due", summaryLeftX, summaryY);
      doc.text(isPaid ? "$0.00" : `$${(invoice?.total || 0).toFixed(2)}`, summaryRightX, summaryY, { align: "right" });

      doc.save(`Invoice_${invoice.invoice_number}.pdf`);

      toast({ title: "Success", description: "Invoice downloaded successfully" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <SheetContent className="w-full sm:max-w-[600px] md:max-w-[700px] overflow-y-auto p-0">
      <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <SheetTitle className="text-lg">Invoice Preview</SheetTitle>
              <p className="text-sm text-gray-500">{invoice.invoice_number}</p>
            </div>
          </div>
          <Button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            {isGeneratingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isGeneratingPDF ? "Generating..." : "Download"}
          </Button>
        </div>
      </div>

      <div ref={invoiceRef} className="p-6 space-y-6">
        {/* Header */}
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 border-b">
            <div className="flex items-start justify-between">
              {/* Company Info */}
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span>Tax ID: 99-0540972</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>936 Broad River Ln, Charlotte, NC 28211</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>+1 (800) 969-6295</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>info@9rx.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-gray-400" />
                  <span>www.9rx.com</span>
                </div>
              </div>

              {/* Logo */}
              <div className="flex-shrink-0">
                <img
                  src="/final.png"
                  alt="Company Logo"
                  className="h-16 object-contain"
                />
              </div>

              {/* Invoice Info */}
              <div className="text-right">
                <h2 className="text-2xl font-bold text-gray-900">Invoice</h2>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="font-medium text-gray-700">
                    <span className="text-gray-500">Invoice:</span> {invoice.invoice_number}
                  </p>
                  <p className="font-medium text-gray-700">
                    <span className="text-gray-500">Order:</span> {invoice.order_number}
                  </p>
                  <p className="font-medium text-gray-700">
                    <span className="text-gray-500">Date:</span> {formattedDate}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Bill To / Ship To */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="overflow-hidden border-0 shadow-sm">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-2 border-b">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-gray-900">Bill To</span>
              </div>
            </div>
            <CardContent className="p-4 space-y-1 text-sm">
              {companyName && <p className="font-semibold text-gray-900">{companyName}</p>}
              <p className="text-gray-700">{invoice.customerInfo?.name || "N/A"}</p>
              <p className="text-gray-600">{invoice.customerInfo?.phone || "N/A"}</p>
              <p className="text-gray-600">{invoice.customerInfo?.email || "N/A"}</p>
              <p className="text-gray-600">
                {invoice.customerInfo?.address?.street || "N/A"}, {invoice.customerInfo?.address?.city || "N/A"}, {invoice.customerInfo?.address?.state || "N/A"} {invoice.customerInfo?.address?.zip_code || "N/A"}
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 shadow-sm">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2 border-b">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold text-gray-900">Ship To</span>
              </div>
            </div>
            <CardContent className="p-4 space-y-1 text-sm">
              {companyName && <p className="font-semibold text-gray-900">{companyName}</p>}
              <p className="text-gray-700">{invoice.shippingInfo?.fullName || "N/A"}</p>
              <p className="text-gray-600">{invoice.shippingInfo?.phone || "N/A"}</p>
              <p className="text-gray-600">{invoice.shippingInfo?.email || "N/A"}</p>
              <p className="text-gray-600">
                {invoice.shippingInfo?.address?.street || "N/A"}, {invoice.shippingInfo?.address?.city || "N/A"}, {invoice.shippingInfo?.address?.state || "N/A"} {invoice.shippingInfo?.address?.zip_code || "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-4 py-2 border-b">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-violet-600" />
              <span className="font-semibold text-gray-900">Items</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-left">Description</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice?.items?.map((item, itemIndex) => (
                  <>
                    <tr key={`header-${itemIndex}`} className="bg-gray-50">
                      <td colSpan={5} className="px-4 py-2 font-semibold text-gray-800">
                        {item.name}
                      </td>
                    </tr>
                    {item.sizes?.map((size, sizeIndex) => (
                      <tr key={`size-${itemIndex}-${sizeIndex}`} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{size.sku || "N/A"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{size.size_value} {size.size_unit}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">{size.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-700">${Number(size.price).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                          ${Number(size.quantity * size.price).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Payment Status & Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Payment Status */}
          <Card className="overflow-hidden border-0 shadow-sm">
            <CardContent className="p-4">
              <Badge 
                className={`mb-4 px-4 py-1.5 text-sm font-semibold ${
                  isPaid 
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                    : "bg-red-100 text-red-700 border-red-200"
                }`}
              >
                {isPaid ? (
                  <><CheckCircle className="w-4 h-4 mr-1.5" /> Paid</>
                ) : (
                  <><XCircle className="w-4 h-4 mr-1.5" /> Unpaid</>
                )}
              </Badge>

              {isPaid && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    {invoice.payment_method === "card" ? (
                      <><CreditCard className="w-4 h-4" /> Transaction ID:</>
                    ) : (
                      <><Hash className="w-4 h-4" /> Payment Notes:</>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 font-mono bg-white px-3 py-2 rounded border">
                    {invoice.payment_method === "card" ? invoice?.payment_transication : invoice?.payment_notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="overflow-hidden border-0 shadow-sm">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Sub Total</span>
                <span className="font-medium text-gray-900">${subtotalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="font-medium text-gray-900">${(invoice?.tax || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping Cost</span>
                <span className="font-medium text-gray-900">${Number(invoice?.shippin_cost || 0).toFixed(2)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-lg text-gray-900">${(invoice?.total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-red-600">Balance Due</span>
                <span className="font-bold text-lg text-red-600">
                  {isPaid ? "$0.00" : `$${(invoice?.total || 0).toFixed(2)}`}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SheetContent>
  )
}
