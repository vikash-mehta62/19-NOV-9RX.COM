"use client"

import { useEffect, useRef, useState } from "react"
import jsPDF from "jspdf"
import "jspdf-autotable"
import { SheetContent, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { 
  Building, MapPin, Phone, Mail, Globe, Download, 
  FileText, CheckCircle, XCircle, CreditCard, Hash,
  User, Truck, Package, Loader2, Printer, X
} from "lucide-react"
import JsBarcode from "jsbarcode"
import Logo from "../../assests/home/9rx_logo.png"

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
    order_id?: string
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
    total_amount?: number
    payment_status: string
    payment_method: string
    payment_notes: string
    created_at: string
    payment_transication: string
    // Discount fields
    discount_amount?: number
    discount_details?: any[]
    // Paid amount field
    paid_amount?: number
  }
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const { toast } = useToast()
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [paidAmount, setPaidAmount] = useState(0)

  console.log("Rendering InvoicePreview with invoice:", invoice)

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
        .maybeSingle()
      if (error) { console.error("Supabase Fetch Error:", error); return }
      if (data) { setCompanyName(data.company_name || "") }
    } catch (error) { console.error("Error fetching user:", error) }
  }

  const fetchPaidAmount = async () => {
    try {
      if (!invoice?.id) return
      
      // First try to get from invoice table
      const invoiceRes = await supabase
        .from("invoices")
        .select("paid_amount, total_amount, payment_status, order_id")
        .eq("id", invoice.id)
        .maybeSingle()
      const invoiceData = invoiceRes.data as { paid_amount?: number; total_amount?: number; payment_status?: string; order_id?: string } | null
      
      let amount = Number(invoiceData?.paid_amount || 0)
      
      // Always try to get latest from linked order (source of truth)
      if (invoiceData?.order_id) {
        const orderRes = await supabase
          .from("orders")
          .select("paid_amount, total_amount, payment_status")
          .eq("id", invoiceData.order_id)
          .maybeSingle()
        const orderData = orderRes.data as { paid_amount?: number; total_amount?: number; payment_status?: string } | null
        
        const orderPaidAmount = Number(orderData?.paid_amount || 0)
        
        // If order has paid_amount, use it (and sync to invoice if different)
        if (orderPaidAmount > 0) {
          amount = orderPaidAmount
          
          // Sync invoice paid_amount with order if different
          if (orderPaidAmount !== Number(invoiceData?.paid_amount || 0)) {
            await supabase
              .from("invoices")
              .update({ 
                paid_amount: orderPaidAmount,
                payment_status: orderData?.payment_status 
              })
              .eq("id", invoice.id)
          }
        } else if (orderData?.payment_status === 'paid') {
          // If order is paid but paid_amount not set, use total
          amount = Number(orderData?.total_amount || 0)
        }
      }
      
      // Fallback: if invoice is paid but no paid_amount, use total
      if (amount === 0 && invoiceData?.payment_status === 'paid') {
        amount = Number(invoiceData?.total_amount || 0)
      }
      
      setPaidAmount(amount)
    } catch (error) { console.error("Error fetching paid amount:", error) }
  }

  useEffect(() => { 
    fetchUser()
    fetchPaidAmount()
  }, [invoice])

  const formattedDate = new Date(invoice.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC",
  })

  const isPaid = invoice?.payment_status === "paid"
  // Use stored total_amount if available, otherwise calculate
  const storedTotal = Number(invoice?.total || invoice?.total_amount || 0)
  const subtotalAmount = invoice?.subtotal || 0
  const taxAmount = Number(invoice?.tax || 0)
  const shippingCost = Number(invoice?.shippin_cost || 0)
  const discountAmount = Number((invoice as any)?.discount_amount || 0)
  
  // Calculate total - use stored total if available, otherwise calculate
  const calculatedTotal = subtotalAmount + taxAmount + shippingCost - discountAmount
  const totalAmount = storedTotal > 0 ? storedTotal : calculatedTotal
  
  console.log("Invoice totals:", {
    subtotal: subtotalAmount,
    tax: taxAmount,
    shipping: shippingCost,
    discount: discountAmount,
    calculatedTotal,
    storedTotal,
    finalTotal: totalAmount,
    paidAmount
  })

  // Generate barcode
  const generateBarcode = (text: string): string => {
    const canvas = document.createElement("canvas")
    JsBarcode(canvas, text, { format: "CODE128", width: 2, height: 40, displayValue: false, margin: 0 })
    return canvas.toDataURL("image/png")
  }

  // Download PDF with same format as admin/pharmacy
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 12

      const brandColor: [number, number, number] = [59, 130, 246]
      const darkGray: [number, number, number] = [60, 60, 60]
      const lightGray: [number, number, number] = [245, 245, 245]

      // ===== HEADER BAND =====
      doc.setFillColor(...brandColor)
      doc.rect(0, 0, pageWidth, 5, "F")

      // ===== LOGO SECTION =====
      let logoLoaded = false
      try {
        const logo = new Image()
        logo.src = Logo
        await new Promise<void>((resolve) => {
          logo.onload = () => { logoLoaded = true; resolve() }
          logo.onerror = () => resolve()
          setTimeout(() => resolve(), 3000)
        })
        if (logoLoaded && logo.width > 0) {
          const logoHeight = 20
          const logoWidth = (logo.width / logo.height) * logoHeight
          doc.addImage(logo, "PNG", margin, 6, logoWidth, logoHeight)
        }
      } catch { /* Continue without logo */ }

      // ===== COMPANY INFO (Left) =====
      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.setTextColor(...darkGray)
      doc.text("9RX LLC", margin, logoLoaded ? 32 : 16)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text("936 Broad River Ln, Charlotte, NC 28211", margin, logoLoaded ? 38 : 22)
      doc.text("Phone: +1 800 969 6295  |  Email: info@9rx.com", margin, logoLoaded ? 43 : 27)
      doc.text("Tax ID: 99-0540972  |  www.9rx.com", margin, logoLoaded ? 48 : 32)

      // ===== DOCUMENT TITLE & NUMBER (Right) =====
      doc.setFont("helvetica", "bold")
      doc.setFontSize(24)
      doc.setTextColor(...brandColor)
      doc.text("INVOICE", pageWidth - margin, 16, { align: "right" })
      doc.setFontSize(10)
      doc.setTextColor(...darkGray)
      doc.text(`# ${invoice.invoice_number}`, pageWidth - margin, 24, { align: "right" })
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      // SO Ref - commented for now, uncomment later
      // doc.setTextColor(120, 120, 120)
      // doc.text(`SO Ref: ${invoice.order_number}`, pageWidth - margin, 29, { align: "right" })
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`Date: ${formattedDate}`, pageWidth - margin, 29, { align: "right" })

      // Payment status badge
      const badgeY = 38
      if (isPaid) {
        doc.setFillColor(34, 197, 94)
        doc.roundedRect(pageWidth - margin - 25, badgeY, 25, 8, 2, 2, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.text("PAID", pageWidth - margin - 12.5, badgeY + 5.5, { align: "center" })
      } else {
        doc.setFillColor(239, 68, 68)
        doc.roundedRect(pageWidth - margin - 30, badgeY, 30, 8, 2, 2, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.text("UNPAID", pageWidth - margin - 15, badgeY + 5.5, { align: "center" })
      }

      // ===== BARCODE =====
      try {
        const barcodeDataUrl = generateBarcode(invoice.invoice_number)
        doc.addImage(barcodeDataUrl, "PNG", pageWidth - margin - 50, badgeY + 12, 50, 12)
      } catch { /* Skip barcode */ }

      // ===== DIVIDER LINE =====
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.5)
      doc.line(margin, 66, pageWidth - margin, 66)

      // ===== BILL TO / SHIP TO SECTION =====
      const infoStartY = 71
      const boxWidth = (pageWidth - margin * 3) / 2
      const drawInfoBox = (title: string, x: number, lines: string[]) => {
        doc.setFillColor(...lightGray)
        doc.roundedRect(x, infoStartY, boxWidth, 35, 2, 2, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(...brandColor)
        doc.text(title, x + 5, infoStartY + 7)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(...darkGray)
        let y = infoStartY + 14
        lines.filter(Boolean).forEach((line, idx) => {
          if (idx < 5) { doc.text(line, x + 5, y, { maxWidth: boxWidth - 10 }); y += 5 }
        })
      }

      const billToLines = [
        companyName,
        invoice.customerInfo?.name,
        invoice.customerInfo?.phone,
        invoice.customerInfo?.email,
        [invoice.customerInfo?.address?.street, invoice.customerInfo?.address?.city, invoice.customerInfo?.address?.state, invoice.customerInfo?.address?.zip_code].filter(Boolean).join(", ")
      ].filter(Boolean) as string[]

      const shipToLines = [
        companyName,
        invoice.shippingInfo?.fullName,
        invoice.shippingInfo?.phone,
        [invoice.shippingInfo?.address?.street, invoice.shippingInfo?.address?.city, invoice.shippingInfo?.address?.state, invoice.shippingInfo?.address?.zip_code].filter(Boolean).join(", ")
      ].filter(Boolean) as string[]

      drawInfoBox("BILL TO", margin, billToLines)
      drawInfoBox("SHIP TO", margin * 2 + boxWidth, shipToLines)

      // ===== ITEMS TABLE =====
      const tableStartY = infoStartY + 42
      const tableHead = [["#", "Description", "Size", "Qty", "Unit Price", "Total"]]
      const tableBody: any[] = []
      let itemIndex = 1

      if (invoice?.items && Array.isArray(invoice.items)) {
        invoice.items.forEach((item: any) => {
          if (Array.isArray(item.sizes)) {
            item.sizes.forEach((size: any, sizeIndex: number) => {
              tableBody.push([
                itemIndex.toString(),
                item.name,
                `${size.size_value} ${size.size_unit}`,
                size.quantity?.toString() || '0',
                `$${Number(size.price).toFixed(2)}`,
                `$${Number(size.price * size.quantity).toFixed(2)}`
              ])
              itemIndex++
              if (sizeIndex === 0 && item.description && item.description.trim()) {
                tableBody.push(["", { content: `↳ ${item.description.trim()}`, styles: { fontStyle: "italic", textColor: [120, 120, 120], fontSize: 8 } }, "", "", "", ""])
              }
            })
          }
        })
      }

      ;(doc as any).autoTable({
        head: tableHead, body: tableBody, startY: tableStartY,
        styles: { fontSize: 9, cellPadding: 3 }, theme: "striped",
        headStyles: { fillColor: brandColor, textColor: 255, fontStyle: "bold", halign: "center" },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: { 0: { halign: "center", cellWidth: 10 }, 1: { cellWidth: "auto" }, 2: { halign: "center", cellWidth: 25 }, 3: { halign: "center", cellWidth: 15 }, 4: { halign: "right", cellWidth: 25 }, 5: { halign: "right", cellWidth: 25 } },
        margin: { left: margin, right: margin, bottom: 45 }, tableWidth: "auto",
        showHead: 'everyPage',
        didDrawPage: (data: any) => {
          // Add header band on every page
          doc.setFillColor(...brandColor)
          doc.rect(0, 0, pageWidth, 5, "F")
          // Add footer band on every page (thin 2mm bar at very bottom)
          doc.setFillColor(...brandColor)
          doc.rect(0, pageHeight - 2, pageWidth, 2, "F")
        }
      })

      let finalY = (doc as any).lastAutoTable.finalY + 8

      // Check if summary section will fit on current page (need ~60mm for summary + footer)
      if (finalY > pageHeight - 70) {
        doc.addPage()
        finalY = 20
      }

      // ===== SUMMARY SECTION =====
      const shippingCost = Number(invoice?.shippin_cost || 0)
      const taxAmount = invoice?.tax || 0
      const invoiceDiscountAmount = Number((invoice as any)?.discount_amount || 0)
      const invoiceDiscountDetails = (invoice as any)?.discount_details || []
      // Use stored total_amount if available, otherwise calculate
      const calculatedTotal = subtotalAmount + shippingCost + taxAmount - invoiceDiscountAmount
      const pdfTotalAmount = totalAmount // Use the totalAmount we calculated earlier from stored value

      // Build summary body with discount if applicable
      const invoiceSummaryBody: any[] = [["Subtotal", `$${subtotalAmount.toFixed(2)}`], ["Shipping", `$${shippingCost.toFixed(2)}`], ["Tax", `$${taxAmount.toFixed(2)}`]]
      if (invoiceDiscountAmount > 0) {
        const discountName = invoiceDiscountDetails.length > 0 ? invoiceDiscountDetails[0].name || "Discount" : "Discount"
        invoiceSummaryBody.push([discountName, `-$${invoiceDiscountAmount.toFixed(2)}`])
      }

      ;(doc as any).autoTable({
        body: invoiceSummaryBody,
        startY: finalY, theme: "plain", styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { halign: "right", cellWidth: 45 }, 1: { halign: "right", cellWidth: 35, fontStyle: "normal" } },
        margin: { left: pageWidth - margin - 85 }, tableWidth: 80,
      })

      const summaryFinalY = (doc as any).lastAutoTable.finalY
      doc.setFillColor(...brandColor)
      doc.roundedRect(pageWidth - margin - 85, summaryFinalY + 2, 80, 10, 1, 1, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(255, 255, 255)
      doc.text("TOTAL", pageWidth - margin - 80, summaryFinalY + 9)
      doc.text(`$${pdfTotalAmount.toFixed(2)}`, pageWidth - margin - 7, summaryFinalY + 9, { align: "right" })

      // Add Paid Amount and Balance Due
      let paidAmountY = summaryFinalY + 14
      if (paidAmount > 0) {
        doc.setFillColor(34, 197, 94) // Green
        doc.roundedRect(pageWidth - margin - 85, paidAmountY, 80, 10, 1, 1, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(255, 255, 255)
        doc.text("PAID AMOUNT", pageWidth - margin - 80, paidAmountY + 7)
        doc.text(`$${paidAmount.toFixed(2)}`, pageWidth - margin - 7, paidAmountY + 7, { align: "right" })
        paidAmountY += 12
      }
      
      const balanceDue = Math.max(0, pdfTotalAmount - paidAmount)
      if (balanceDue > 0) {
        doc.setFillColor(239, 68, 68) // Red
        doc.roundedRect(pageWidth - margin - 85, paidAmountY, 80, 10, 1, 1, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(255, 255, 255)
        doc.text("BALANCE DUE", pageWidth - margin - 80, paidAmountY + 7)
        doc.text(`$${balanceDue.toFixed(2)}`, pageWidth - margin - 7, paidAmountY + 7, { align: "right" })
      } else if (paidAmount > 0) {
        doc.setFillColor(34, 197, 94) // Green
        doc.roundedRect(pageWidth - margin - 85, paidAmountY, 80, 10, 1, 1, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(255, 255, 255)
        doc.text("FULLY PAID", pageWidth - margin - 45, paidAmountY + 7, { align: "center" })
      }

      // ===== FOOTER =====
      const footerY = pageHeight - 30
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.3)
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(...brandColor)
      doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" })
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)

      if (isPaid) {
        const transactionId = invoice?.payment_transication || ""
        if (transactionId) {
          doc.text(`Transaction ID: ${transactionId}  |  Questions? Contact us at info@9rx.com`, pageWidth / 2, footerY + 6, { align: "center" })
        } else if (invoice?.payment_notes) {
          doc.text(`Payment Notes: ${invoice.payment_notes}  |  Questions? Contact us at info@9rx.com`, pageWidth / 2, footerY + 6, { align: "center" })
        } else {
          doc.text("Payment Received  |  Questions? Contact us at info@9rx.com", pageWidth / 2, footerY + 6, { align: "center" })
        }
      } else {
        doc.text("Payment Terms: Net 30  |  Questions? Contact us at info@9rx.com", pageWidth / 2, footerY + 6, { align: "center" })
      }

      // Add page numbers to all pages (Page X of Y format)
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        // Draw page number text above the green footer band
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: "center" })
      }

      doc.save(`Invoice_${invoice.invoice_number}.pdf`)
      toast({ title: "Success", description: "Invoice downloaded successfully" })
    } catch (error) {
      console.error("Error generating PDF:", error)
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Handle Print
  const handlePrint = async () => {
    setIsGeneratingPDF(true)
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 12
      const brandColor: [number, number, number] = [59, 130, 246]
      const darkGray: [number, number, number] = [60, 60, 60]
      const lightGray: [number, number, number] = [245, 245, 245]

      doc.setFillColor(...brandColor)
      doc.rect(0, 0, pageWidth, 5, "F")

      let logoLoaded = false
      try {
        const logo = new Image()
        logo.src = Logo
        await new Promise<void>((resolve) => {
          logo.onload = () => { logoLoaded = true; resolve() }
          logo.onerror = () => resolve()
          setTimeout(() => resolve(), 3000)
        })
        if (logoLoaded && logo.width > 0) {
          const logoHeight = 20
          const logoWidth = (logo.width / logo.height) * logoHeight
          doc.addImage(logo, "PNG", margin, 6, logoWidth, logoHeight)
        }
      } catch { /* Continue */ }

      doc.setFont("helvetica", "bold")
      doc.setFontSize(16)
      doc.setTextColor(...darkGray)
      doc.text("9RX LLC", margin, logoLoaded ? 32 : 16)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text("936 Broad River Ln, Charlotte, NC 28211", margin, logoLoaded ? 38 : 22)
      doc.text("Phone: +1 800 969 6295  |  Email: info@9rx.com", margin, logoLoaded ? 43 : 27)
      doc.text("Tax ID: 99-0540972  |  www.9rx.com", margin, logoLoaded ? 48 : 32)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(24)
      doc.setTextColor(...brandColor)
      doc.text("INVOICE", pageWidth - margin, 16, { align: "right" })
      doc.setFontSize(10)
      doc.setTextColor(...darkGray)
      doc.text(`# ${invoice.invoice_number}`, pageWidth - margin, 24, { align: "right" })
      // SO Ref - commented for now, uncomment later
      // doc.setFont("helvetica", "normal")
      // doc.setFontSize(8)
      // doc.setTextColor(120, 120, 120)
      // doc.text(`SO Ref: ${invoice.order_number}`, pageWidth - margin, 29, { align: "right" })
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`Date: ${formattedDate}`, pageWidth - margin, 29, { align: "right" })

      const badgeY = 38
      if (isPaid) {
        doc.setFillColor(34, 197, 94)
        doc.roundedRect(pageWidth - margin - 25, badgeY, 25, 8, 2, 2, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.text("PAID", pageWidth - margin - 12.5, badgeY + 5.5, { align: "center" })
      } else {
        doc.setFillColor(239, 68, 68)
        doc.roundedRect(pageWidth - margin - 30, badgeY, 30, 8, 2, 2, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.text("UNPAID", pageWidth - margin - 15, badgeY + 5.5, { align: "center" })
      }

      try {
        const barcodeDataUrl = generateBarcode(invoice.invoice_number)
        doc.addImage(barcodeDataUrl, "PNG", pageWidth - margin - 50, badgeY + 12, 50, 12)
      } catch { /* Skip */ }

      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.5)
      doc.line(margin, 66, pageWidth - margin, 66)

      const infoStartY = 71
      const boxWidth = (pageWidth - margin * 3) / 2
      const drawInfoBox = (title: string, x: number, lines: string[]) => {
        doc.setFillColor(...lightGray)
        doc.roundedRect(x, infoStartY, boxWidth, 35, 2, 2, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(...brandColor)
        doc.text(title, x + 5, infoStartY + 7)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(...darkGray)
        let y = infoStartY + 14
        lines.filter(Boolean).forEach((line, idx) => { if (idx < 5) { doc.text(line, x + 5, y, { maxWidth: boxWidth - 10 }); y += 5 } })
      }

      const billToLines = [companyName, invoice.customerInfo?.name, invoice.customerInfo?.phone, invoice.customerInfo?.email,
        [invoice.customerInfo?.address?.street, invoice.customerInfo?.address?.city, invoice.customerInfo?.address?.state, invoice.customerInfo?.address?.zip_code].filter(Boolean).join(", ")].filter(Boolean) as string[]
      const shipToLines = [companyName, invoice.shippingInfo?.fullName, invoice.shippingInfo?.phone,
        [invoice.shippingInfo?.address?.street, invoice.shippingInfo?.address?.city, invoice.shippingInfo?.address?.state, invoice.shippingInfo?.address?.zip_code].filter(Boolean).join(", ")].filter(Boolean) as string[]

      drawInfoBox("BILL TO", margin, billToLines)
      drawInfoBox("SHIP TO", margin * 2 + boxWidth, shipToLines)

      const tableStartY = infoStartY + 42
      const tableHead = [["#", "Description", "Size", "Qty", "Unit Price", "Total"]]
      const tableBody: any[] = []
      let itemIndex = 1
      if (invoice?.items && Array.isArray(invoice.items)) {
        invoice.items.forEach((item: any) => {
          if (Array.isArray(item.sizes)) {
            item.sizes.forEach((size: any, sizeIndex: number) => {
              tableBody.push([itemIndex.toString(), item.name, `${size.size_value} ${size.size_unit}`, size.quantity?.toString() || '0', `$${Number(size.price).toFixed(2)}`, `$${Number(size.price * size.quantity).toFixed(2)}`])
              itemIndex++
              if (sizeIndex === 0 && item.description && item.description.trim()) {
                tableBody.push(["", { content: `↳ ${item.description.trim()}`, styles: { fontStyle: "italic", textColor: [120, 120, 120], fontSize: 8 } }, "", "", "", ""])
              }
            })
          }
        })
      }

      ;(doc as any).autoTable({
        head: tableHead, body: tableBody, startY: tableStartY,
        styles: { fontSize: 9, cellPadding: 3 }, theme: "striped",
        headStyles: { fillColor: brandColor, textColor: 255, fontStyle: "bold", halign: "center" },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: { 0: { halign: "center", cellWidth: 10 }, 1: { cellWidth: "auto" }, 2: { halign: "center", cellWidth: 25 }, 3: { halign: "center", cellWidth: 15 }, 4: { halign: "right", cellWidth: 25 }, 5: { halign: "right", cellWidth: 25 } },
        margin: { left: margin, right: margin, bottom: 45 }, tableWidth: "auto",
        showHead: 'everyPage',
        didDrawPage: (data: any) => {
          doc.setFillColor(...brandColor)
          doc.rect(0, 0, pageWidth, 5, "F")
          // Add footer band on every page (thin 2mm bar at very bottom)
          doc.setFillColor(...brandColor)
          doc.rect(0, pageHeight - 2, pageWidth, 2, "F")
        }
      })

      let finalY = (doc as any).lastAutoTable.finalY + 8
      if (finalY > pageHeight - 70) {
        doc.addPage()
        finalY = 20
      }

      const shippingCost = Number(invoice?.shippin_cost || 0)
      const taxAmount = invoice?.tax || 0
      const printDiscountAmount = Number((invoice as any)?.discount_amount || 0)
      const printDiscountDetails = (invoice as any)?.discount_details || []
      // Use stored total_amount if available, otherwise calculate
      const printCalculatedTotal = subtotalAmount + shippingCost + taxAmount - printDiscountAmount
      const pdfTotalAmount = totalAmount // Use the totalAmount we calculated earlier from stored value

      // Build summary body with discount if applicable
      const printSummaryBody: any[] = [["Subtotal", `$${subtotalAmount.toFixed(2)}`], ["Shipping", `$${shippingCost.toFixed(2)}`], ["Tax", `$${taxAmount.toFixed(2)}`]]
      if (printDiscountAmount > 0) {
        const discountName = printDiscountDetails.length > 0 ? printDiscountDetails[0].name || "Discount" : "Discount"
        printSummaryBody.push([discountName, `-$${printDiscountAmount.toFixed(2)}`])
      }

      ;(doc as any).autoTable({
        body: printSummaryBody,
        startY: finalY, theme: "plain", styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { halign: "right", cellWidth: 45 }, 1: { halign: "right", cellWidth: 35 } },
        margin: { left: pageWidth - margin - 85 }, tableWidth: 80,
      })

      const summaryFinalY = (doc as any).lastAutoTable.finalY
      doc.setFillColor(...brandColor)
      doc.roundedRect(pageWidth - margin - 85, summaryFinalY + 2, 80, 10, 1, 1, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(255, 255, 255)
      doc.text("TOTAL", pageWidth - margin - 80, summaryFinalY + 9)
      doc.text(`$${pdfTotalAmount.toFixed(2)}`, pageWidth - margin - 7, summaryFinalY + 9, { align: "right" })

      // Add Paid Amount and Balance Due for Print
      let printPaidAmountY = summaryFinalY + 14
      if (paidAmount > 0) {
        doc.setFillColor(34, 197, 94) // Green
        doc.roundedRect(pageWidth - margin - 85, printPaidAmountY, 80, 10, 1, 1, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(255, 255, 255)
        doc.text("PAID AMOUNT", pageWidth - margin - 80, printPaidAmountY + 7)
        doc.text(`$${paidAmount.toFixed(2)}`, pageWidth - margin - 7, printPaidAmountY + 7, { align: "right" })
        printPaidAmountY += 12
      }
      
      const printBalanceDue = Math.max(0, pdfTotalAmount - paidAmount)
      if (printBalanceDue > 0) {
        doc.setFillColor(239, 68, 68) // Red
        doc.roundedRect(pageWidth - margin - 85, printPaidAmountY, 80, 10, 1, 1, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(255, 255, 255)
        doc.text("BALANCE DUE", pageWidth - margin - 80, printPaidAmountY + 7)
        doc.text(`$${printBalanceDue.toFixed(2)}`, pageWidth - margin - 7, printPaidAmountY + 7, { align: "right" })
      } else if (paidAmount > 0) {
        doc.setFillColor(34, 197, 94) // Green
        doc.roundedRect(pageWidth - margin - 85, printPaidAmountY, 80, 10, 1, 1, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(255, 255, 255)
        doc.text("FULLY PAID", pageWidth - margin - 45, printPaidAmountY + 7, { align: "center" })
      }

      const footerY = pageHeight - 30
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.3)
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(...brandColor)
      doc.text("Thank you for your business!", pageWidth / 2, footerY, { align: "center" })
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      if (isPaid) {
        const transactionId = invoice?.payment_transication || ""
        if (transactionId) {
          doc.text(`Transaction ID: ${transactionId}  |  Questions? Contact us at info@9rx.com`, pageWidth / 2, footerY + 6, { align: "center" })
        } else if (invoice?.payment_notes) {
          doc.text(`Payment Notes: ${invoice.payment_notes}  |  Questions? Contact us at info@9rx.com`, pageWidth / 2, footerY + 6, { align: "center" })
        } else {
          doc.text("Payment Received  |  Questions? Contact us at info@9rx.com", pageWidth / 2, footerY + 6, { align: "center" })
        }
      } else {
        doc.text("Payment Terms: Net 30  |  Questions? Contact us at info@9rx.com", pageWidth / 2, footerY + 6, { align: "center" })
      }

      // Add page numbers to all pages (Page X of Y format)
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        // Draw page number text above the green footer band
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: "center" })
      }

      const pdfBlob = doc.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = 'none'
      iframe.src = pdfUrl
      document.body.appendChild(iframe)
      iframe.onload = () => {
        setTimeout(() => {
          try { iframe.contentWindow?.focus(); iframe.contentWindow?.print() }
          catch (e) { const printWindow = window.open(pdfUrl, '_blank'); if (printWindow) { printWindow.onload = () => { setTimeout(() => { printWindow.print() }, 300) } } }
          setTimeout(() => { document.body.removeChild(iframe); URL.revokeObjectURL(pdfUrl) }, 1000)
        }, 500)
      }
    } catch (error) {
      console.error("Print Error:", error)
      toast({ title: "Error", description: "Failed to print document.", variant: "destructive" })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  return (
    <SheetContent className="w-full sm:max-w-[600px] md:max-w-[700px] overflow-y-auto p-0">
      <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 py-3 sm:py-4">
        {/* Mobile: Close button positioned absolutely at top right */}
        <div className="sm:hidden absolute top-2 right-2 z-20">
          <SheetClose asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full">
              <X className="w-4 h-4 text-gray-500" />
            </Button>
          </SheetClose>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 pr-10 sm:pr-0">
            <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div>
              <SheetTitle className="text-base sm:text-lg">Invoice Preview</SheetTitle>
              <p className="text-xs sm:text-sm text-gray-500">{invoice.invoice_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} disabled={isGeneratingPDF} variant="outline" size="sm" className="gap-1.5 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3">
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Print
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF} size="sm" className="bg-blue-600 hover:bg-blue-700 gap-1.5 sm:gap-2 h-8 sm:h-9 text-xs sm:text-sm px-2.5 sm:px-3">
              {isGeneratingPDF ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              {isGeneratingPDF ? "..." : "Download"}
            </Button>
            {/* Desktop: Close button with other buttons */}
            <div className="hidden sm:block">
              <SheetClose asChild>
                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-500" />
                </Button>
              </SheetClose>
            </div>
          </div>
        </div>
      </div>

      <div ref={invoiceRef} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-3 sm:p-4 border-b">
            {/* Mobile: Logo and Invoice info on same row at top */}
            <div className="flex items-start justify-between gap-3 mb-3 sm:mb-0">
              <div className="flex-shrink-0"><img src={Logo} alt="Company Logo" className="h-10 sm:h-16 object-contain" /></div>
              <div className="text-right">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Invoice</h2>
                <div className="mt-1 space-y-0.5 text-[11px] sm:text-sm">
                  <p className="font-medium text-gray-700"><span className="text-gray-500">Invoice:</span> {invoice.invoice_number}</p>
                  <p className="font-medium text-gray-700"><span className="text-gray-500">Order:</span> {invoice.order_number}</p>
                  <p className="font-medium text-gray-700"><span className="text-gray-500">Date:</span> {formattedDate}</p>
                </div>
              </div>
            </div>
            {/* Company Info - Below on mobile, hidden on desktop (shown in different position) */}
            <div className="space-y-1 text-[11px] sm:text-sm text-gray-600 pt-3 border-t sm:border-t-0 sm:pt-0">
              <div className="flex items-center gap-1.5"><Building className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" /><span>Tax ID: 99-0540972</span></div>
              <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" /><span>936 Broad River Ln, Charlotte, NC 28211</span></div>
              <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" /><span>+1 (800) 969-6295</span></div>
              <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" /><span>info@9rx.com</span></div>
              <div className="flex items-center gap-1.5"><Globe className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" /><span>www.9rx.com</span></div>
            </div>
          </div>
        </Card>

        {/* Bill To / Ship To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Card className="overflow-hidden border-0 shadow-sm">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 sm:px-4 py-1.5 sm:py-2 border-b">
              <div className="flex items-center gap-1.5 sm:gap-2"><User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" /><span className="font-semibold text-gray-900 text-sm sm:text-base">Bill To</span></div>
            </div>
            <CardContent className="p-3 sm:p-4 space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
              {companyName && <p className="font-semibold text-gray-900">{companyName}</p>}
              <p className="text-gray-700">{invoice.customerInfo?.name || "N/A"}</p>
              <p className="text-gray-600">{invoice.customerInfo?.phone || "N/A"}</p>
              <p className="text-gray-600">{invoice.customerInfo?.email || "N/A"}</p>
              <p className="text-gray-600">{invoice.customerInfo?.address?.street || "N/A"}, {invoice.customerInfo?.address?.city || "N/A"}, {invoice.customerInfo?.address?.state || "N/A"} {invoice.customerInfo?.address?.zip_code || "N/A"}</p>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-0 shadow-sm">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 sm:px-4 py-1.5 sm:py-2 border-b">
              <div className="flex items-center gap-1.5 sm:gap-2"><Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" /><span className="font-semibold text-gray-900 text-sm sm:text-base">Ship To</span></div>
            </div>
            <CardContent className="p-3 sm:p-4 space-y-0.5 sm:space-y-1 text-xs sm:text-sm">
              {companyName && <p className="font-semibold text-gray-900">{companyName}</p>}
              <p className="text-gray-700">{invoice.shippingInfo?.fullName || "N/A"}</p>
              <p className="text-gray-600">{invoice.shippingInfo?.phone || "N/A"}</p>
              <p className="text-gray-600">{invoice.shippingInfo?.email || "N/A"}</p>
              <p className="text-gray-600">{invoice.shippingInfo?.address?.street || "N/A"}, {invoice.shippingInfo?.address?.city || "N/A"}, {invoice.shippingInfo?.address?.state || "N/A"} {invoice.shippingInfo?.address?.zip_code || "N/A"}</p>
            </CardContent>
          </Card>
        </div>

        {/* Items Table */}
        <Card className="overflow-hidden border-0 shadow-sm">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 px-3 sm:px-4 py-1.5 sm:py-2 border-b">
            <div className="flex items-center gap-1.5 sm:gap-2"><Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-600" /><span className="font-semibold text-gray-900 text-sm sm:text-base">Items</span></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-500 text-[10px] sm:text-xs font-semibold text-white uppercase tracking-wider">
                <tr>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-10">#</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Description</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Size</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Qty</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap">Unit Price</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice?.items?.flatMap((item, itemIndex) => 
                  item.sizes?.map((size: any, sizeIndex: number) => (
                    <tr key={`item-${itemIndex}-${sizeIndex}`} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center text-gray-600">{itemIndex + 1}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-gray-800">{item.name}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center text-gray-700">{size.size_value} {size.size_unit}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center text-gray-700">{size.quantity}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center text-gray-700">${Number(size.price).toFixed(2)}</td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center font-medium text-gray-900">${Number(size.quantity * size.price).toFixed(2)}</td>
                    </tr>
                  )) || []
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Payment Status & Summary */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <Card className="overflow-hidden border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4">
              <Badge className={`mb-3 sm:mb-4 px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-semibold ${isPaid ? "bg-emerald-100 text-emerald-700 border-emerald-200" : invoice?.payment_status === 'partial_paid' ? "bg-yellow-100 text-yellow-700 border-yellow-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                {isPaid ? <><CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" /> Paid</> : invoice?.payment_status === 'partial_paid' ? <><CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" /> Partial Paid</> : <><XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" /> Unpaid</>}
              </Badge>
              {isPaid && (
                <div className="p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {invoice.payment_method === "card" ? <><CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Transaction ID:</> : <><Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Payment Notes:</>}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 font-mono bg-white px-2 sm:px-3 py-1.5 sm:py-2 rounded border break-all">
                    {invoice.payment_method === "card" ? invoice?.payment_transication : invoice?.payment_notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="flex justify-between text-xs sm:text-sm"><span className="text-gray-600">Sub Total</span><span className="font-medium text-gray-900">${subtotalAmount.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs sm:text-sm"><span className="text-gray-600">Tax</span><span className="font-medium text-gray-900">${(invoice?.tax || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-xs sm:text-sm"><span className="text-gray-600">Shipping Cost</span><span className="font-medium text-gray-900">${Number(invoice?.shippin_cost || 0).toFixed(2)}</span></div>
              {/* Show discount if applied */}
              {Number((invoice as any)?.discount_amount || 0) > 0 && (
                <>
                  <Separator />
                  {((invoice as any)?.discount_details || []).map((discount: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-green-600">{discount.name || "Discount"}</span>
                      <span className="font-medium text-green-600">
                        {discount.amount > 0 ? `-$${discount.amount.toFixed(2)}` : "Free Shipping"}
                      </span>
                    </div>
                  ))}
                  {((invoice as any)?.discount_details || []).length === 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Discount</span>
                      <span className="font-medium text-green-600">-${Number((invoice as any)?.discount_amount || 0).toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
              <Separator />
              <div className="flex justify-between"><span className="font-semibold text-sm sm:text-base text-gray-900">Total</span><span className="font-bold text-base sm:text-lg text-gray-900">${totalAmount.toFixed(2)}</span></div>
              {Number((invoice as any)?.discount_amount || 0) > 0 && (
                <div className="text-right text-sm text-green-600">
                  You saved: ${Number((invoice as any)?.discount_amount || 0).toFixed(2)}
                </div>
              )}
              {/* Paid Amount Display */}
              {paidAmount > 0 && (
                <div className="flex justify-between p-1.5 sm:p-2 bg-green-50 rounded border border-green-200">
                  <span className="font-semibold text-xs sm:text-sm text-green-600">✓ Paid Amount</span>
                  <span className="font-bold text-sm sm:text-lg text-green-600">${paidAmount.toFixed(2)}</span>
                </div>
              )}
              {/* Balance Due */}
              <div className="flex justify-between"><span className="font-semibold text-sm sm:text-base text-red-600">Balance Due</span><span className="font-bold text-base sm:text-lg text-red-600">${Math.max(0, totalAmount - paidAmount).toFixed(2)}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SheetContent>
  )
}

