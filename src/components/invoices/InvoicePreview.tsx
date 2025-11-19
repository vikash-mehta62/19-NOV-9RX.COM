"use client"

import { useEffect, useRef, useState } from "react"
import jsPDF from "jspdf"
import html2canvas from "html2canvas"
import { SheetContent, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { defaultValues } from "@/components/settings/settingsTypes"
import type { SettingsFormValues } from "@/components/settings/settingsTypes"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Building, MapPin, Phone, Mail, Globe } from "lucide-react";
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
  const pdfTemplateRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [componyName, setComponyName] = useState("")

  console.log(invoice)
  if (!invoice) {
    toast({
      title: "Error",
      description: "Invoice data is not available",
      variant: "destructive",
    })
    return (
      <SheetContent className="w-full sm:max-w-[600px] md:max-w-[800px] lg:max-w-[900px] overflow-y-auto">
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No invoice data available</p>
        </div>
      </SheetContent>
    )
  }


  const fetchUser = async () => {

    try {
      if (!invoice || !invoice.profile_id) return

      const userID = invoice.profile_id


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
      setComponyName(data.company_name || "")

    } catch (error) {

    }
  };

  useEffect(() => {
    fetchUser()
  }, [invoice])

  const formattedDate = new Date(invoice.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  });



  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)

    try {
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;


      // Barcode value
      const barcodeCanvas = document.createElement("canvas");
      const barcodeValue = `${invoice.invoice_number}`;

      JsBarcode(barcodeCanvas, barcodeValue, {
        displayValue: false,
      });

      // Convert to image
      const barcodeImage = barcodeCanvas.toDataURL("image/png");

      // Set barcode dimensions
      const barcodeWidth = 40;
      const barcodeHeight = 12;

      // Align barcode to right side (same as text)
      const barcodeX = pageWidth - margin - 42; // right-aligned
      const barcodeY = margin + 26; // just below the "Date - ..." text



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
      doc.text("INVOICE", pageWidth - margin, margin + 10, { align: "right" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      // Compact spacing: 4pt gap per line
      doc.text(`ORDER - ${invoice.order_number}`, pageWidth - margin, margin + 15, { align: "right" });
      doc.text(`INVOICE - ${invoice.invoice_number}`, pageWidth - margin, margin + 20, { align: "right" });
      doc.text(`Date - ${formattedDate}`, pageWidth - margin, margin + 25, { align: "right" });

      // Divider line
      doc.setDrawColor(200);
      doc.line(margin, margin + 29, pageWidth - margin, margin + 29);

      // Customer and shipping info
      const infoStartY = margin + 37

      // Bill To
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("Bill To", margin, infoStartY)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.text(componyName, margin, infoStartY + 5)
      doc.text(invoice.customerInfo?.name || "N/A", margin, infoStartY + 10)
      doc.text(invoice.customerInfo?.phone || "N/A", margin, infoStartY + 15)
      doc.text(invoice.customerInfo?.email || "N/A", margin, infoStartY + 20)
      doc.text(
        `${invoice.customerInfo.address?.street || "N/A"}, ${invoice.customerInfo.address?.city || "N/A"}, ${invoice.customerInfo.address?.state || "N/A"} ${invoice.customerInfo.address?.zip_code || "N/A"}`,
        margin,
        infoStartY + 25,
        { maxWidth: contentWidth / 2 - 5 },
      )

      // Ship To
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("Ship To", pageWidth / 2, infoStartY)

      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.text(componyName, pageWidth / 2, infoStartY + 5)
      doc.text(invoice.shippingInfo?.fullName || "N/A", pageWidth / 2, infoStartY + 10)
      doc.text(invoice.shippingInfo?.phone || "N/A", pageWidth / 2, infoStartY + 15)
      doc.text(invoice.shippingInfo?.email || "N/A", pageWidth / 2, infoStartY + 20)
      doc.text(
        `${invoice.shippingInfo.address?.street || "N/A"}, ${invoice.shippingInfo.address?.city || "N/A"}, ${invoice.shippingInfo.address?.state || "N/A"} ${invoice.shippingInfo.address?.zip_code || "N/A"}`,
        pageWidth / 2,
        infoStartY + 25,
        { maxWidth: contentWidth / 2 - 5 },
      )

      // Horizontal line
      doc.line(margin, infoStartY + 35, pageWidth - margin, infoStartY + 35)

      // Items table
      const tableStartY = infoStartY + 45

      // Prepare table data

      // This code assumes `doc` is your jsPDF instance and `invoice` is your JSON data object.
      const tableHead = [
        ["ITEMS", "DESCRIPTION", "QUANTITY", "UNIT PRICE", "TOTAL"]
      ];

      const tableBody = [];

      if (invoice?.items && Array.isArray(invoice.items)) {
        invoice.items.forEach((item) => {
          // 1. Add a header row for the product name, spanning all columns
          tableBody.push([
            {
              content: item.name,
              colSpan: 5,
              styles: {
                fontStyle: 'bold',
                halign: 'left',
                fillColor: [245, 245, 245], // A light grey background
                textColor: [0, 0, 0]
              }
            }
          ]);

          // 2. Add a data row for each size variation under that product
          if (Array.isArray(item.sizes)) {
            item.sizes.forEach((size) => {
              const itemSku = size.sku || "N/A";
              const description = `${size.size_value} ${size.size_unit}`;
              const quantity = size.quantity?.toString() || '0';
              const unitPrice = `$${Number(size.price).toFixed(2)}`;
              const total = `$${Number(size.price *size.quantity ).toFixed(2)}`;

              tableBody.push([
                itemSku,
                description,
                quantity,
                unitPrice,
                total
              ]);
            });
          }
        });
      } else {
        console.warn("Invoice data is missing or has no items.");
        tableBody.push([{ content: "No items found in this invoice.", colSpan: 5, styles: { halign: 'center' } }]);
      }

      // 3. Generate the table using autoTable
      (doc as any).autoTable({
        head: tableHead,
        body: tableBody,
        startY: tableStartY, // Your starting Y position
        theme: "grid",
        headStyles: {
          fillColor: [230, 230, 230], // Header background color
          textColor: [0, 0, 0],       // Header text color (black)
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 35 },     // ITEMS (SKU)
          1: { cellWidth: 'auto' }, // DESCRIPTION
          2: { halign: "right" },   // QUANTITY
          3: { halign: "right" },   // UNIT PRICE
          4: { halign: "right" },   // TOTAL
        },
        margin: { left: margin, right: margin },
      });



      // Get the final Y position after the table
      const finalY = (doc as any).lastAutoTable.finalY + 10

      // Payment status and summary section
      const paymentStatusX = margin
      const paymentStatusWidth = contentWidth / 3
      const summaryWidth = contentWidth * 0.45; // make it 45% of full width
      const summaryX = pageWidth - margin - summaryWidth; // align right


      // Payment status box
      doc.setFillColor(240, 240, 240)
      doc.rect(paymentStatusX, finalY, paymentStatusWidth, 40, "F")
      doc.setDrawColor(200, 200, 200)
      doc.rect(paymentStatusX, finalY, paymentStatusWidth, 40, "S")

      // Payment status label
      if (invoice?.payment_status === "paid") {
        doc.setFillColor(39, 174, 96)
        doc.setTextColor(255, 255, 255)
      } else {
        doc.setFillColor(231, 76, 60)
        doc.setTextColor(255, 255, 255)
      }

      doc.roundedRect(paymentStatusX + 5, finalY + 5, 50, 10, 5, 5, "F")
      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.text(invoice?.payment_status === "paid" ? "Paid" : "Unpaid", paymentStatusX + 10, finalY + 11)

      // Payment details if paid
      if (invoice?.payment_status === "paid") {
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.text(
          invoice.payment_method === "card" ? "Transaction ID:" : "Payment Notes:",
          paymentStatusX + 5,
          finalY + 25,
        )

        doc.setFont("helvetica", "normal")
        doc.text(
          invoice.payment_method === "card" ? invoice?.payment_transication : invoice?.payment_notes,
          paymentStatusX + 5,
          finalY + 30,
          { maxWidth: paymentStatusWidth - 10 },
        )
      }

      // Summary box
      doc.setFillColor(255, 255, 255)
      doc.setTextColor(0, 0, 0)
      doc.rect(summaryX, finalY, summaryWidth, 40, "F")
      doc.setDrawColor(200, 200, 200)
      doc.rect(summaryX, finalY, summaryWidth, 40, "S")

      // Summary content
      const summaryLeftX = summaryX + 5
      const summaryRightX = summaryX + summaryWidth - 5
      let summaryY = finalY + 10

      // Sub Total
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      doc.text("Sub Total", summaryLeftX, summaryY)
      doc.text(`$${(invoice?.subtotal - invoice?.tax - Number(invoice.shippin_cost))?.toFixed(2) || "0.00"}`, summaryRightX, summaryY, {
        align: "right",
      })

      // Tax
      summaryY += 5
      doc.text(
        `Tax `,
        summaryLeftX,
        summaryY,
      )
      doc.text(`$${invoice?.tax?.toFixed(2) || "0.00"}`, summaryRightX, summaryY, { align: "right" })
      summaryY += 5
      doc.text(
        `Shipping `,
        summaryLeftX,
        summaryY,
      )
      doc.text(`$${Number(invoice?.shippin_cost)?.toFixed(2) || "0.00"}`, summaryRightX, summaryY, { align: "right" })

      // Divider
      summaryY += 3
      doc.line(summaryLeftX, summaryY, summaryRightX, summaryY)

      // Total
      summaryY += 5
      doc.setFont("helvetica", "bold")
      doc.text("Total", summaryLeftX, summaryY)
      doc.text(`$${invoice?.total?.toFixed(2) || "0.00"}`, summaryRightX, summaryY, { align: "right" })

      // Balance Due
      summaryY += 5
      doc.setTextColor(231, 76, 60)
      doc.text("Balance Due", summaryLeftX, summaryY)
      doc.text(
        invoice?.payment_status === "paid" ? "$0" : `$${invoice?.total?.toFixed(2) || "0.00"}`,
        summaryRightX,
        summaryY,
        { align: "right" },
      )

      // Save the PDF
      doc.save(`Invoice_${invoice.invoice_number}.pdf`)

      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }



  return (
    <SheetContent className="w-full sm:max-w-[600px] md:max-w-[800px] lg:max-w-[900px] overflow-y-auto p-2 sm:p-6">
      {/* Visible invoice preview - responsive */}
      <div ref={invoiceRef} className="border p-3 sm:p-6 space-y-4 sm:space-y-8 bg-white">
        {/* Company Name & Logo */}
        <div className="flex flex-col sm:flex-row justify-between  sm:items-center border-b pb-4 gap-4 ">
          <div>

            <div className="mt-3 ml-0 text-xs sm:text-[12px] w-full">
              <Building className="inline-block mr-1" size={12} /> Tax ID : 99-0540972 <br />
              <MapPin className="inline-block mr-1" size={12} />936 Broad River Ln, <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Charlotte, NC 28211 <br />
              <Phone className="inline-block mr-1" size={12} /> +1 800 969 6295 <br />
              <Mail className="inline-block mr-1" size={12} /> info@9rx.com <br />
              <Globe className="inline-block mr-1" size={12} /> www.9rx.com <br />
            </div>
          </div>
          <div className="flex  items-center  justify-center  w-">

            <div className=" ">
              <img
                src={settings.logo || "/final.png" || "/placeholder.svg"}
                alt="Company Logo"
                className="h-16 sm:h-16 md:h-[6rem] relative z-10 contrast-200"
              />
            </div>

          </div>

          <div className="w-full sm:w-auto text-right sm:text-right">
            <SheetTitle className="text-xl sm:text-2xl md:text-3xl">Invoice</SheetTitle>
            <p className="opacity-80 font-bold text-xs sm:text-sm">INVOICE -{invoice.invoice_number}</p>
            <p className="opacity-80 font-bold text-xs sm:text-sm">ORDER - {invoice.order_number}</p>
            <p className="opacity-80 font-bold text-xs sm:text-sm">Date - {formattedDate}</p>
          </div>
        </div>

        {/* Customer & Shipping Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 border-b pb-4">
          <div>
            <h3 className="font-semibold text-sm sm:text-base">Bill To</h3>
            <p className="text-xs sm:text-sm">{componyName}</p>
            <p className="text-xs sm:text-sm">{invoice.customerInfo?.name || "N/A"}</p>
            <p className="text-xs sm:text-sm">{invoice.customerInfo?.phone || "N/A"}</p>
            <p className="text-xs sm:text-sm">{invoice.customerInfo?.email || "N/A"}</p>
            <p className="text-xs sm:text-sm">{invoice.customerInfo.address?.street || "N/A"}, {invoice.customerInfo.address?.city || "N/A"}, {invoice.customerInfo.address?.state || "N/A"} {invoice.customerInfo.address?.zip_code || "N/A"}</p>
          </div>
          <div className="mt-4 sm:mt-0">
            <h3 className="font-semibold text-sm sm:text-base">Ship To</h3>
            <p className="text-xs sm:text-sm">{componyName}</p>
            <p className="text-xs sm:text-sm">{invoice.shippingInfo?.fullName || "N/A"}</p>
            <p className="text-xs sm:text-sm">{invoice.shippingInfo?.phone || "N/A"}</p>
            <p className="text-xs sm:text-sm">{invoice.shippingInfo?.email || "N/A"}</p>
            <p className="text-xs sm:text-sm">{invoice.shippingInfo.address?.street || "N/A"}, {invoice.shippingInfo.address?.city || "N/A"}, {invoice.shippingInfo.address?.state || "N/A"} {invoice.shippingInfo.address?.zip_code || "N/A"}</p>

          </div>
        </div>

        {/* Items Table - Responsive */}
     {/* Items Table - Responsive */}
<div className="overflow-x-auto">
  <table className="w-full border-collapse border border-gray-300 min-w-[600px]">
    {/* Table Head */}
    <thead className="bg-gray-200 text-xs sm:text-sm font-medium">
      <tr>
        <th className="border p-2 text-left">ITEMS</th>
        <th className="border p-2 text-left">DESCRIPTION</th>
        <th className="border p-2 text-right">QUANTITY</th>
        <th className="border p-2 text-right">UNIT PRICE</th>
        <th className="border p-2 text-right">TOTAL</th>
      </tr>
    </thead>

    {/* Table Body */}
    {invoice?.items?.map((item) => (
      <tbody key={item.productId}>
        {/* Product group header row */}
        <tr className="bg-gray-100">
          <td colSpan={5} className="border p-2 font-bold text-gray-800">
            {item.name}
          </td>
        </tr>

        {/* Rows for each size */}
        {item.sizes?.map((size) => (
          <tr key={size.id} className="border-b text-xs sm:text-sm hover:bg-gray-50">
            <td className="border p-2">{size.sku || "N/A"}</td>
            <td className="border p-2">{`${size.size_value} ${size.size_unit}`}</td>
            <td className="border p-2 text-right">{size.quantity}</td>
            <td className="border p-2 text-right">${Number(size.price).toFixed(2)}</td>
            <td className="border p-2 text-right">${Number(size.quantity *size.price ).toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    ))}
  </table>
</div>


        {/* Totals */}
        <div className="flex flex-col lg:flex-row justify-between items-start border-t pt-4 space-y-4 lg:space-y-0 lg:space-x-4">
          {/* Left: Payment Status */}
          <div className="w-full lg:w-1/3 p-4 bg-gray-100 rounded-lg shadow-md border border-gray-300">
            {/* Payment Status */}
            <p
              className={`px-5 py-2 rounded-full text-sm font-semibold flex items-center gap-2 w-max text-left shadow-md 
      ${invoice?.payment_status === "paid"
                  ? "bg-green-500 text-white"
                  : "bg-red-500 text-white"}`}
            >
              {invoice?.payment_status === "paid" ? "✅ Paid" : "❌ Unpaid"}
            </p>

            {/* Payment Details */}
            {invoice?.payment_status === "paid" && (
              <div className="mt-3 p-4 bg-white rounded-lg shadow-lg border-l-4 border-green-500">
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  {invoice.payment_method === "card" ? "💳 Transaction ID:" : "📝 Payment Notes:"}
                </p>
                <p className="text-sm text-gray-700 mt-1 bg-gray-100 px-3 py-2 rounded-md shadow-sm">
                  {invoice.payment_method === "card" ? invoice?.payment_transication : invoice?.payment_notes}
                </p>
              </div>
            )}
          </div>

          {/* Right: Invoice Summary */}
          <div className="w-full lg:w-2/3 p-4 bg-white rounded-lg shadow-md border border-gray-300">
            <div className="space-y-2">
              {/* Sub Total */}
              <div className="flex justify-between text-sm sm:text-base">
                <span>Sub Total</span>
                <span>${(invoice?.subtotal - invoice?.tax - Number(invoice?.shippin_cost))?.toFixed(2) || "0.00"}</span>
              </div>

              {/* Tax */}
              {/* ({invoice?.subtotal ? ((invoice.tax / invoice.subtotal) * 100).toFixed(2) : "0"}%) */}
              <div className="flex justify-between text-sm sm:text-base">
                <span>Tax </span>
                <span>${invoice?.tax?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base">
                <span>Shipping Cost </span>
                <span>${Number(invoice?.shippin_cost).toFixed(2) || "0.00"}</span>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex justify-between font-bold text-base sm:text-lg">
                <span>Total</span>
                <span>${invoice?.total?.toFixed(2) || "0.00"}</span>
              </div>

              {/* Balance Due */}
              <div className="flex justify-between font-bold text-base sm:text-lg text-red-600">
                <span>Balance Due</span>
                <span>{invoice?.payment_status === "paid" ? "$0" : `$${invoice?.total?.toFixed(2) || "0.00"}`}</span>
              </div>
            </div>
          </div>
        </div>


      </div>

      {/* Download Button */}
      <div className="text-center pt-4">
        <button
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded text-sm sm:text-base transition-colors disabled:opacity-50"
        >
          {isGeneratingPDF ? "Generating PDF..." : "Download Invoice"}
        </button>
      </div>

      {/* Hidden PDF template with fixed laptop-like dimensions - this will be used for PDF generation */}
      <div className="fixed left-[-9999px] top-[-9999px] overflow-hidden ">
        <div
          ref={pdfTemplateRef}
          className="w-[800px] p-6 space-y-8 bg-white border"
          style={{ fontFamily: "Arial, sans-serif" }}
        >
          {/* Company Name & Logo */}
          <div className="flex flex-col sm:flex-row justify-between  sm:items-center border-b pb-4 gap-4 ">
            <div>

              <div className="mt-3 ml-0 text-xs sm:text-[12px] w-full">
                <Building className="inline-block mr-1" size={12} /> Tax ID : 99-0540972 <br />
                <MapPin className="inline-block mr-1" size={12} />936 Broad River Ln, <br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Charlotte, NC 28211 <br />
                <Phone className="inline-block mr-1" size={12} /> +1 800 969 6295 <br />
                <Mail className="inline-block mr-1" size={12} /> info@9rx.com <br />
                <Globe className="inline-block mr-1" size={12} /> www.9rx.com <br />
              </div>
            </div>
            <div className="flex  items-center  justify-center  w-">

              <div className=" ">
                <img
                  src={settings.logo || "/final.png" || "/placeholder.svg"}
                  alt="Company Logo"
                  className="h-16 sm:h-16 md:h-[6rem] relative z-10 contrast-200"
                />
              </div>

            </div>

            <div className="w-full sm:w-auto text-right sm:text-right">
              <SheetTitle className="text-xl sm:text-2xl md:text-3xl">Invoice</SheetTitle>
              <p className="opacity-80 font-bold text-xs sm:text-sm">INVOICE -{invoice.invoice_number}</p>
              <p className="opacity-80 font-bold text-xs sm:text-sm">ORDER - {invoice.order_number}</p>
              <p className="opacity-80 font-bold text-xs sm:text-sm">Date - {formattedDate}</p>

            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div className="grid grid-cols-2 gap-8 border-b pb-4">
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Bill To</h3>
              <p className="text-xs sm:text-sm">{componyName}</p>
              <p className="text-xs sm:text-sm">{invoice.customerInfo?.name || "N/A"}</p>
              <p className="text-xs sm:text-sm">{invoice.customerInfo?.phone || "N/A"}</p>
              <p className="text-xs sm:text-sm">{invoice.customerInfo?.email || "N/A"}</p>
              <p className="text-xs sm:text-sm">{invoice.customerInfo.address?.street || "N/A"}, {invoice.customerInfo.address?.city || "N/A"}, {invoice.customerInfo.address?.state || "N/A"} {invoice.customerInfo.address?.zip_code || "N/A"}</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <h3 className="font-semibold text-sm sm:text-base">Ship To</h3>
              <p className="text-xs sm:text-sm">{componyName}</p>
              <p className="text-xs sm:text-sm">{invoice.shippingInfo?.fullName || "N/A"}</p>
              <p className="text-xs sm:text-sm">{invoice.shippingInfo?.phone || "N/A"}</p>
              <p className="text-xs sm:text-sm">{invoice.shippingInfo?.email || "N/A"}</p>
              <p className="text-xs sm:text-sm">{invoice.shippingInfo.address?.street || "N/A"}, {invoice.shippingInfo.address?.city || "N/A"}, {invoice.shippingInfo.address?.state || "N/A"} {invoice.shippingInfo.address?.zip_code || "N/A"}</p>

            </div>
          </div>

          {/* Items Table - Fixed width for PDF */}
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-200 text-sm font-medium">
              <tr>
                <th className="border p-2 text-left">Description</th>
                <th className="border p-2 text-left">Sizes</th>
                <th className="border p-2 text-right">Qty</th>
                <th className="border p-2 text-right">Amount</th>

              </tr>
            </thead>
            <tbody>
              {invoice?.items?.map((item, index) => (
                <tr key={index} className="border-b text-sm">
                  <td className="border p-2">{item.name}</td>
                  <td className="border p-2">
                    {item.sizes?.map((size) => `${size.size_value} ${size.size_unit}`).join(", ")}
                  </td>
                  <td className="border p-2 text-right">{item.quantity}</td>
                  <td className="border p-2 text-right">${item.price}</td>

                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-between items-start border-t pt-4 space-x-4">
            {/* Left: Payment Status */}
            <div className="w-1/3 p-4 bg-gray-100 rounded-lg shadow-md border border-gray-300">
              {/* Payment Status */}
              <p
                className={`px-5 py-2 mb-5 rounded-full text-sm font-semibold flex items-center gap-2 w-max text-left shadow-md 
      ${invoice?.payment_status === "paid"
                    ? "bg-green-500 text-white"
                    : "bg-red-500 text-white"}`}
              >
                {invoice?.payment_status === "paid" ? "✅ Paid" : "❌ Unpaid"}
              </p>

              {/* Payment Details */}
              {invoice?.payment_status === "paid" && (
                <div className="mt-3 p-4 bg-white rounded-lg shadow-lg border-l-4 border-green-500">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    {invoice.payment_method === "card" ? "💳 Transaction ID:" : "📝 Payment Notes:"}
                  </p>
                  <p className="text-sm text-gray-700 mt-1 bg-gray-100 px-3 py-2 rounded-md shadow-sm">
                    {invoice.payment_method === "card" ? invoice?.payment_transication : invoice?.payment_notes}
                  </p>
                </div>
              )}
            </div>

            {/* Right: Invoice Summary */}
            <div className="w-2/3 p-4 bg-white rounded-lg shadow-md border border-gray-300">
              <div className="space-y-2">
                {/* Sub Total */}
                <div className="flex justify-between text-sm sm:text-base">
                  <span>Sub Total</span>
                  <span>${(invoice?.subtotal - invoice?.tax)?.toFixed(2) || "0.00"}</span>
                </div>

                {/* Tax */}
                <div className="flex justify-between text-sm sm:text-base">
                  <span>Tax ({invoice?.subtotal ? ((invoice.tax / invoice.subtotal) * 100).toFixed(2) : "0"}%)</span>
                  <span>${invoice?.tax?.toFixed(2) || "0.00"}</span>
                </div>

                <Separator />

                {/* Total */}
                <div className="flex justify-between font-bold text-base sm:text-lg">
                  <span>Total</span>
                  <span>${invoice?.total?.toFixed(2) || "0.00"}</span>
                </div>

                {/* Balance Due */}
                <div className="flex justify-between font-bold text-base sm:text-lg text-red-600">
                  <span>Balance Due</span>
                  <span>{invoice?.payment_status === "paid" ? "$0" : `$${invoice?.total?.toFixed(2) || "0.00"}`}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SheetContent>
  )
}

