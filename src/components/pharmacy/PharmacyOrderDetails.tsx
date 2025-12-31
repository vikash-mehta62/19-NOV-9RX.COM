"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Package, DollarSign, MapPin, Truck, Calendar, 
  FileText, CreditCard, Phone, Mail, Download,
  Clock, CheckCircle, XCircle, AlertCircle, Copy, ExternalLink,
  Printer, Hash
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/supabaseClient"
import { OrderFormValues, ShippingAddressData } from "@/components/orders/schemas/orderSchema"
import { OrderActivityTimeline } from "@/components/orders/OrderActivityTimeline"
import jsPDF from "jspdf"
import "jspdf-autotable"
import JsBarcode from "jsbarcode"

interface PharmacyOrderDetailsProps {
  order: OrderFormValues
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Helper function to get address fields
const getAddressField = (
  shippingAddress: ShippingAddressData | undefined,
  type: "billing" | "shipping",
  field: string
): string => {
  if (!shippingAddress) return ""
  const addressObj = shippingAddress[type]
  if (addressObj && typeof addressObj === 'object') {
    const value = (addressObj as Record<string, string>)[field]
    if (value) return value
  }
  if (shippingAddress.address && typeof shippingAddress.address === 'object') {
    const legacyAddress = shippingAddress.address as Record<string, string>
    return legacyAddress[field] || ""
  }
  return ""
}

export const PharmacyOrderDetails = ({ order, open, onOpenChange }: PharmacyOrderDetailsProps) => {
  const { toast } = useToast()
  const [companyName, setCompanyName] = useState("")
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [paidAmount, setPaidAmount] = useState(0)

  // Fetch company name and paid amount
  useEffect(() => {
    const fetchData = async () => {
      if (!order?.customer) return
      
      // Fetch company name
      const { data } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("id", order.customer)
        .maybeSingle()
      if (data) setCompanyName(data.company_name || "")
      
      // Fetch paid_amount from order
      if (order?.id) {
        const { data: orderData } = await supabase
          .from("orders")
          .select("paid_amount, total_amount, payment_status")
          .eq("id", order.id)
          .maybeSingle()
        
        if (orderData) {
          let amount = Number(orderData.paid_amount || 0)
          if (amount === 0 && orderData.payment_status === 'paid') {
            amount = Number(orderData.total_amount || 0)
          }
          setPaidAmount(amount)
        }
      }
    }
    fetchData()
  }, [order?.customer, order?.id])

  // Calculate totals
  const subtotal = order.items.reduce((total, item) => {
    return total + item.sizes.reduce((sum, size) => sum + size.quantity * size.price, 0)
  }, 0)
  const shipping = parseFloat(order.shipping_cost || "0")
  const tax = parseFloat(order.tax_amount?.toString() || "0")
  const discountAmount = parseFloat((order as any).discount_amount?.toString() || "0")
  const discountDetails = (order as any).discount_details || []
  
  // Calculate correct total: Subtotal + Shipping + Tax - Discount
  // Don't use stored total_amount as it may have discount already subtracted
  const total = subtotal + shipping + tax - discountAmount
  
  // Count total line items (sizes across all products)
  const totalLineItems = order.items.reduce(
    (total, item) => total + (item.sizes?.length || 0), 0
  )
  
  // Count total units (sum of all quantities)
  const totalUnits = order.items.reduce(
    (total, item) => total + item.sizes.reduce((sum, size) => sum + size.quantity, 0), 0
  )

  // Formatted date for PDF
  const formattedDate = new Date(order.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  })

  // Generate barcode
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

  // Get shipping address
  const shippingStreet = getAddressField(order.shippingAddress, "shipping", "street1") || 
                         order.shippingAddress?.address?.street || ""
  const shippingCity = getAddressField(order.shippingAddress, "shipping", "city") || 
                       order.shippingAddress?.address?.city || ""
  const shippingState = getAddressField(order.shippingAddress, "shipping", "state") || 
                        order.shippingAddress?.address?.state || ""
  const shippingZip = getAddressField(order.shippingAddress, "shipping", "zipCode") || 
                      order.shippingAddress?.address?.zip_code || ""

  // Copy order number
  const copyOrderNumber = () => {
    navigator.clipboard.writeText(order.order_number || "")
    toast({ title: "Copied!", description: "Order number copied to clipboard" })
  }

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
        return { color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle, label: "Delivered" }
      case "shipped":
        return { color: "bg-blue-100 text-blue-700 border-blue-200", icon: Truck, label: "Shipped" }
      case "processing":
        return { color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock, label: "Processing" }
      case "cancelled":
        return { color: "bg-red-100 text-red-700 border-red-200", icon: XCircle, label: "Cancelled" }
      default:
        return { color: "bg-gray-100 text-gray-700 border-gray-200", icon: AlertCircle, label: status || "Pending" }
    }
  }

  const statusInfo = getStatusInfo(order.status)
  const StatusIcon = statusInfo.icon

  // Download PDF with barcode (same as admin)
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 12

      // Brand color
      const brandColor: [number, number, number] = [0, 150, 136]
      const darkGray: [number, number, number] = [60, 60, 60]
      const lightGray: [number, number, number] = [245, 245, 245]

      // ===== HEADER BAND =====
      doc.setFillColor(...brandColor)
      doc.rect(0, 0, pageWidth, 5, "F")

      // ===== LOGO SECTION =====
      let logoLoaded = false
      try {
        const logo = new Image()
        logo.src = "/final.png"
        await new Promise<void>((resolve) => {
          logo.onload = () => { logoLoaded = true; resolve() }
          logo.onerror = () => resolve()
          setTimeout(() => resolve(), 3000)
        })
        if (logoLoaded && logo.width > 0) {
          const logoHeight = 20
          const logoWidth = (logo.width / logo.height) * logoHeight
          doc.addImage(logo, "PNG", margin, 8, logoWidth, logoHeight)
        }
      } catch {
        // Continue without logo
      }

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
      const invoiceNumber = (order as any).invoice_number
      const isNewOrder = order.status === "new" || order.status === "pending"
      let documentTitle: string
      let documentNumber: string
      if (invoiceNumber && !isNewOrder) {
        documentTitle = "INVOICE"
        documentNumber = invoiceNumber
      } else {
        documentTitle = "SALES ORDER"
        documentNumber = order.order_number || ""
      }
      doc.setFont("helvetica", "bold")
      doc.setFontSize(24)
      doc.setTextColor(...brandColor)
      doc.text(documentTitle, pageWidth - margin, 16, { align: "right" })
      doc.setFontSize(10)
      doc.setTextColor(...darkGray)
      doc.text(`# ${documentNumber}`, pageWidth - margin, 24, { align: "right" })
      if (invoiceNumber && !isNewOrder) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.text(`SO Ref: ${order.order_number}`, pageWidth - margin, 29, { align: "right" })
      }
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`Date: ${formattedDate}`, pageWidth - margin, invoiceNumber && !isNewOrder ? 34 : 30, { align: "right" })

      // Payment status badge
      const badgeY = invoiceNumber && !isNewOrder ? 39 : 34
      if (order.payment_status === "paid") {
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
        const barcodeDataUrl = generateBarcode(documentNumber)
        doc.addImage(barcodeDataUrl, "PNG", pageWidth - margin - 50, badgeY + 8, 50, 12)
      } catch {
        // Skip barcode if generation fails
      }

      // ===== DIVIDER LINE =====
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.5)
      doc.line(margin, 58, pageWidth - margin, 58)

      // ===== BILL TO / SHIP TO SECTION =====
      const infoStartY = 63
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
          if (idx < 5) {
            doc.text(line, x + 5, y, { maxWidth: boxWidth - 10 })
            y += 5
          }
        })
      }

      const billToLines = [
        companyName,
        order.customerInfo?.name,
        order.customerInfo?.phone,
        order.customerInfo?.email,
        [
          getAddressField(order.shippingAddress, "billing", "street1"),
          getAddressField(order.shippingAddress, "billing", "city"),
          getAddressField(order.shippingAddress, "billing", "state"),
          getAddressField(order.shippingAddress, "billing", "zipCode")
        ].filter(Boolean).join(", ")
      ].filter(Boolean) as string[]

      const shipToLines = [
        getAddressField(order.shippingAddress, "shipping", "companyName") || companyName,
        order.customerInfo?.name,
        getAddressField(order.shippingAddress, "shipping", "phone") || order.customerInfo?.phone,
        [
          getAddressField(order.shippingAddress, "shipping", "street1"),
          getAddressField(order.shippingAddress, "shipping", "city"),
          getAddressField(order.shippingAddress, "shipping", "state"),
          getAddressField(order.shippingAddress, "shipping", "zipCode")
        ].filter(Boolean).join(", ")
      ].filter(Boolean) as string[]

      drawInfoBox("BILL TO", margin, billToLines)
      drawInfoBox("SHIP TO", margin * 2 + boxWidth, shipToLines)

      // ===== ITEMS TABLE =====
      const tableStartY = infoStartY + 42
      const tableHead = [["#", "Description", "Size", "Qty", "Unit Price", "Total"]]
      const tableBody: any[] = []
      let itemIndex = 1
      order.items.forEach((item: any) => {
        item.sizes.forEach((size: any, sizeIndex: number) => {
          const sizeValueUnit = `${size.size_value} ${size.size_unit}`
          const quantity = size.quantity.toString()
          const pricePerUnit = `$${Number(size.price).toFixed(2)}`
          const totalPerSize = `$${(size.quantity * size.price).toFixed(2)}`
          tableBody.push([itemIndex.toString(), item.name, sizeValueUnit, quantity, pricePerUnit, totalPerSize])
          itemIndex++
          if (sizeIndex === 0 && item.description && item.description.trim()) {
            tableBody.push([
              "",
              { content: `↳ ${item.description.trim()}`, styles: { fontStyle: "italic", textColor: [120, 120, 120], fontSize: 8 } },
              "", "", "", "",
            ])
          }
        })
      })

      ;(doc as any).autoTable({
        head: tableHead,
        body: tableBody,
        startY: tableStartY,
        styles: { fontSize: 9, cellPadding: 3 },
        theme: "striped",
        headStyles: { fillColor: brandColor, textColor: 255, fontStyle: "bold", halign: "center" },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { cellWidth: "auto" },
          2: { halign: "center", cellWidth: 25 },
          3: { halign: "center", cellWidth: 15 },
          4: { halign: "right", cellWidth: 25 },
          5: { halign: "right", cellWidth: 25 },
        },
        margin: { left: margin, right: margin, bottom: 45 },
        tableWidth: "auto",
        showHead: 'everyPage',
        didDrawPage: (data: any) => {
          doc.setFillColor(...brandColor)
          doc.rect(0, 0, pageWidth, 5, "F")
          doc.setFillColor(...brandColor)
          doc.rect(0, pageHeight - 5, pageWidth, 5, "F")
        }
      })

      let finalY = (doc as any).lastAutoTable.finalY + 8

      // Check if summary section will fit on current page
      if (finalY > pageHeight - 70) {
        doc.addPage()
        finalY = 20
      }

      // ===== SUMMARY SECTION =====
      const handling = Number((order as any)?.po_handling_charges || 0)
      const fred = Number((order as any)?.po_fred_charges || 0)
      const pdfDiscountAmount = discountAmount
      const pdfTotal = subtotal + handling + fred + shipping + tax - pdfDiscountAmount

      const summaryBody: any[] = [
        ["Subtotal", `$${subtotal.toFixed(2)}`],
        ["Shipping & Handling", `$${(handling + shipping).toFixed(2)}`],
        ["Tax", `$${(fred + tax).toFixed(2)}`],
      ]
      
      // Add discount row if applicable
      if (pdfDiscountAmount > 0) {
        const discountName = discountDetails.length > 0 ? discountDetails[0].name || "Discount" : "Discount"
        summaryBody.push([discountName, `-$${pdfDiscountAmount.toFixed(2)}`])
      }

      ;(doc as any).autoTable({
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
      })

      // Total row with highlight
      const summaryFinalY = (doc as any).lastAutoTable.finalY
      doc.setFillColor(...brandColor)
      doc.roundedRect(pageWidth - margin - 85, summaryFinalY + 2, 80, 10, 1, 1, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(255, 255, 255)
      doc.text("TOTAL", pageWidth - margin - 80, summaryFinalY + 9)
      doc.text(`$${pdfTotal.toFixed(2)}`, pageWidth - margin - 7, summaryFinalY + 9, { align: "right" })

      // Add Paid Amount and Balance Due
      let pdfPaidAmountY = summaryFinalY + 14
      if (paidAmount > 0) {
        doc.setFillColor(34, 197, 94) // Green
        doc.roundedRect(pageWidth - margin - 85, pdfPaidAmountY, 80, 10, 1, 1, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(255, 255, 255)
        doc.text("PAID AMOUNT", pageWidth - margin - 80, pdfPaidAmountY + 7)
        doc.text(`$${paidAmount.toFixed(2)}`, pageWidth - margin - 7, pdfPaidAmountY + 7, { align: "right" })
        pdfPaidAmountY += 12
      }
      
      const pdfBalanceDue = Math.max(0, pdfTotal - paidAmount)
      if (pdfBalanceDue > 0) {
        doc.setFillColor(239, 68, 68) // Red
        doc.roundedRect(pageWidth - margin - 85, pdfPaidAmountY, 80, 10, 1, 1, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(255, 255, 255)
        doc.text("BALANCE DUE", pageWidth - margin - 80, pdfPaidAmountY + 7)
        doc.text(`$${pdfBalanceDue.toFixed(2)}`, pageWidth - margin - 7, pdfPaidAmountY + 7, { align: "right" })
      } else if (paidAmount > 0) {
        doc.setFillColor(34, 197, 94) // Green
        doc.roundedRect(pageWidth - margin - 85, pdfPaidAmountY, 80, 8, 1, 1, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.setTextColor(255, 255, 255)
        doc.text("FULLY PAID", pageWidth - margin - 50, pdfPaidAmountY + 5.5, { align: "center" })
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
      if (order.payment_status === "paid") {
        const transactionId = (order as any).payment_transication || ""
        if (transactionId) {
          doc.text(`Transaction ID: ${transactionId}  |  Questions? Contact us at info@9rx.com`, pageWidth / 2, footerY + 6, { align: "center" })
        } else {
          doc.text("Payment Received  |  Questions? Contact us at info@9rx.com", pageWidth / 2, footerY + 6, { align: "center" })
        }
      } else {
        doc.text("Payment Terms: Net 30  |  Questions? Contact us at info@9rx.com", pageWidth / 2, footerY + 6, { align: "center" })
      }
      doc.setFillColor(...brandColor)
      doc.rect(0, pageHeight - 12, pageWidth, 3, "F")

      doc.save(`${order.order_number}.pdf`)
      toast({ title: "Success", description: "Invoice downloaded successfully" })
    } catch (error) {
      console.error("PDF Error:", error)
      toast({ title: "Error", description: "Failed to generate PDF.", variant: "destructive" })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Handle Print - Opens PDF in new window and triggers print dialog
  const handlePrint = async () => {
    setIsGeneratingPDF(true)
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 12
      const brandColor: [number, number, number] = [0, 150, 136]
      const darkGray: [number, number, number] = [60, 60, 60]
      const lightGray: [number, number, number] = [245, 245, 245]

      doc.setFillColor(...brandColor)
      doc.rect(0, 0, pageWidth, 5, "F")

      let logoLoaded = false
      try {
        const logo = new Image()
        logo.src = "/final.png"
        await new Promise<void>((resolve) => {
          logo.onload = () => { logoLoaded = true; resolve() }
          logo.onerror = () => resolve()
          setTimeout(() => resolve(), 3000)
        })
        if (logoLoaded && logo.width > 0) {
          const logoHeight = 20
          const logoWidth = (logo.width / logo.height) * logoHeight
          doc.addImage(logo, "PNG", margin, 8, logoWidth, logoHeight)
        }
      } catch { /* Continue without logo */ }

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

      const invoiceNumber = (order as any).invoice_number
      const isNewOrder = order.status === "new" || order.status === "pending"
      let documentTitle: string
      let documentNumber: string
      if (invoiceNumber && !isNewOrder) {
        documentTitle = "INVOICE"
        documentNumber = invoiceNumber
      } else {
        documentTitle = "SALES ORDER"
        documentNumber = order.order_number || ""
      }
      doc.setFont("helvetica", "bold")
      doc.setFontSize(24)
      doc.setTextColor(...brandColor)
      doc.text(documentTitle, pageWidth - margin, 16, { align: "right" })
      doc.setFontSize(10)
      doc.setTextColor(...darkGray)
      doc.text(`# ${documentNumber}`, pageWidth - margin, 24, { align: "right" })
      if (invoiceNumber && !isNewOrder) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.text(`SO Ref: ${order.order_number}`, pageWidth - margin, 29, { align: "right" })
      }
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`Date: ${formattedDate}`, pageWidth - margin, invoiceNumber && !isNewOrder ? 34 : 30, { align: "right" })

      const badgeY = invoiceNumber && !isNewOrder ? 39 : 34
      if (order.payment_status === "paid") {
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
        const barcodeDataUrl = generateBarcode(documentNumber)
        doc.addImage(barcodeDataUrl, "PNG", pageWidth - margin - 50, badgeY + 8, 50, 12)
      } catch { /* Skip barcode */ }

      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.5)
      doc.line(margin, 58, pageWidth - margin, 58)

      const infoStartY = 63
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
        companyName, order.customerInfo?.name, order.customerInfo?.phone, order.customerInfo?.email,
        [getAddressField(order.shippingAddress, "billing", "street1"), getAddressField(order.shippingAddress, "billing", "city"),
         getAddressField(order.shippingAddress, "billing", "state"), getAddressField(order.shippingAddress, "billing", "zipCode")].filter(Boolean).join(", ")
      ].filter(Boolean) as string[]

      const shipToLines = [
        getAddressField(order.shippingAddress, "shipping", "companyName") || companyName, order.customerInfo?.name,
        getAddressField(order.shippingAddress, "shipping", "phone") || order.customerInfo?.phone,
        [getAddressField(order.shippingAddress, "shipping", "street1"), getAddressField(order.shippingAddress, "shipping", "city"),
         getAddressField(order.shippingAddress, "shipping", "state"), getAddressField(order.shippingAddress, "shipping", "zipCode")].filter(Boolean).join(", ")
      ].filter(Boolean) as string[]

      drawInfoBox("BILL TO", margin, billToLines)
      drawInfoBox("SHIP TO", margin * 2 + boxWidth, shipToLines)

      const tableStartY = infoStartY + 42
      const tableHead = [["#", "Description", "Size", "Qty", "Unit Price", "Total"]]
      const tableBody: any[] = []
      let itemIndex = 1
      order.items.forEach((item: any) => {
        item.sizes.forEach((size: any, sizeIndex: number) => {
          tableBody.push([itemIndex.toString(), item.name, `${size.size_value} ${size.size_unit}`, size.quantity.toString(), `$${Number(size.price).toFixed(2)}`, `$${(size.quantity * size.price).toFixed(2)}`])
          itemIndex++
          if (sizeIndex === 0 && item.description && item.description.trim()) {
            tableBody.push(["", { content: `↳ ${item.description.trim()}`, styles: { fontStyle: "italic", textColor: [120, 120, 120], fontSize: 8 } }, "", "", "", ""])
          }
        })
      })

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
          doc.setFillColor(...brandColor)
          doc.rect(0, pageHeight - 5, pageWidth, 5, "F")
        }
      })

      let finalY = (doc as any).lastAutoTable.finalY + 8
      if (finalY > pageHeight - 70) {
        doc.addPage()
        finalY = 20
      }
      const handling = Number((order as any)?.po_handling_charges || 0)
      const fred = Number((order as any)?.po_fred_charges || 0)
      const printDiscountAmount = discountAmount
      const pdfTotal = subtotal + handling + fred + shipping + tax - printDiscountAmount

      // Build summary body with discount if applicable
      const printSummaryBody: any[] = [["Subtotal", `$${subtotal.toFixed(2)}`], ["Shipping & Handling", `$${(handling + shipping).toFixed(2)}`], ["Tax", `$${(fred + tax).toFixed(2)}`]]
      if (printDiscountAmount > 0) {
        const discountName = discountDetails.length > 0 ? discountDetails[0].name || "Discount" : "Discount"
        printSummaryBody.push([discountName, `-$${printDiscountAmount.toFixed(2)}`])
      }

      ;(doc as any).autoTable({
        body: printSummaryBody,
        startY: finalY, theme: "plain", styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { halign: "right", cellWidth: 45 }, 1: { halign: "right", cellWidth: 35, fontStyle: "normal" } },
        margin: { left: pageWidth - margin - 85 }, tableWidth: 80,
      })

      const summaryFinalY = (doc as any).lastAutoTable.finalY
      doc.setFillColor(...brandColor)
      doc.roundedRect(pageWidth - margin - 85, summaryFinalY + 2, 80, 10, 1, 1, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(255, 255, 255)
      doc.text("TOTAL", pageWidth - margin - 80, summaryFinalY + 9)
      doc.text(`$${pdfTotal.toFixed(2)}`, pageWidth - margin - 7, summaryFinalY + 9, { align: "right" })

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
        printPaidAmountY += 12
      }
      
      const printBalanceDue = Math.max(0, pdfTotal - paidAmount)
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
        doc.roundedRect(pageWidth - margin - 85, printPaidAmountY, 80, 8, 1, 1, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.setTextColor(255, 255, 255)
        doc.text("FULLY PAID", pageWidth - margin - 50, printPaidAmountY + 5.5, { align: "center" })
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
      if (order.payment_status === "paid") {
        const transactionId = (order as any).payment_transication || ""
        doc.text(transactionId ? `Transaction ID: ${transactionId}  |  Questions? Contact us at info@9rx.com` : "Payment Received  |  Questions? Contact us at info@9rx.com", pageWidth / 2, footerY + 6, { align: "center" })
      } else {
        doc.text("Payment Terms: Net 30  |  Questions? Contact us at info@9rx.com", pageWidth / 2, footerY + 6, { align: "center" })
      }
      doc.setFillColor(...brandColor)
      doc.rect(0, pageHeight - 12, pageWidth, 3, "F")

      // Open PDF in iframe for printing
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
          try {
            iframe.contentWindow?.focus()
            iframe.contentWindow?.print()
          } catch (e) {
            const printWindow = window.open(pdfUrl, '_blank')
            if (printWindow) {
              printWindow.onload = () => { setTimeout(() => { printWindow.print() }, 300) }
            }
          }
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-2xl p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-gray-900">SO #{order.order_number}</h2>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={copyOrderNumber}>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(order.date).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrint} disabled={isGeneratingPDF}>
                    <Printer className="w-4 h-4 mr-1" />
                    Print
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge className={`${statusInfo.color} border gap-1.5 px-3 py-1`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusInfo.label}
                </Badge>
                <Badge className={`border px-3 py-1 ${order.payment_status === "paid" ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}>
                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                  {order.payment_status === "paid" ? "Paid" : "Unpaid"}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 bg-blue-50 border-0">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Line Items</p>
                    <p className="text-lg font-bold text-blue-700">{totalLineItems}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3 bg-emerald-50 border-0">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Total</p>
                    <p className="text-lg font-bold text-emerald-700">${total.toFixed(2)}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-3 bg-purple-50 border-0">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Units</p>
                    <p className="text-lg font-bold text-purple-700">{totalUnits}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Shipping Address */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
                <div className="flex items-center gap-2 text-white">
                  <MapPin className="w-4 h-4" />
                  <span className="font-semibold">Shipping Address</span>
                </div>
              </div>
              <CardContent className="p-4">
                <p className="font-semibold text-gray-900">{order.shippingAddress?.fullName || order.customerInfo?.name || "N/A"}</p>
                {shippingStreet ? (
                  <>
                    <p className="text-gray-600 text-sm mt-1">{shippingStreet}</p>
                    <p className="text-gray-600 text-sm">{[shippingCity, shippingState].filter(Boolean).join(", ")} {shippingZip}</p>
                  </>
                ) : (
                  <p className="text-gray-400 text-sm italic mt-1">No address provided</p>
                )}
                {order.shippingAddress?.phone && (
                  <p className="text-gray-500 text-sm mt-2 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {order.shippingAddress.phone}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Tracking Info (if shipped) */}
            {(order as any).tracking_number && (
              <Card className="overflow-hidden border-0 shadow-sm bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Truck className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-blue-600 font-medium">Tracking Number</p>
                        <p className="font-mono font-semibold text-blue-800">{(order as any).tracking_number}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="bg-white">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Track
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <div className="bg-gradient-to-r from-violet-500 to-purple-500 px-4 py-3">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    <span className="font-semibold">SO Items</span>
                  </div>
                  <Badge className="bg-white/20 text-white border-0">
                    {order.items.length} {order.items.length === 1 ? "product" : "products"}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {order.items.map((item, index) => (
                    <div key={index} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">{item.name}</h4>
                          <div className="mt-2 space-y-1.5">
                            {item.sizes.map((size, sizeIdx) => (
                              <div key={sizeIdx} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-700">{size.size_value} {size.size_unit}</span>
                                    {(size as any).type && (
                                      <Badge variant="outline" className="text-xs h-5 capitalize">{(size as any).type}</Badge>
                                    )}
                                  </div>
                                  {(size as any).sku && (
                                    <span className="text-xs text-gray-400">SKU: {(size as any).sku}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-gray-500">{size.quantity} × ${size.price.toFixed(2)}</span>
                                  <span className="font-semibold text-gray-900">${(size.quantity * size.price).toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          {item.notes && (
                            <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                              <p className="text-xs text-blue-600 flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {item.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* SO Summary */}
            <Card className="overflow-hidden border-0 shadow-sm">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3">
                <div className="flex items-center gap-2 text-white">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-semibold">SO Summary</span>
                </div>
              </div>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal ({totalLineItems} line items)</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">{shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                
                {/* Show discount if applied */}
                {discountAmount > 0 && (
                  <>
                    <Separator />
                    {discountDetails.map((discount: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-green-600">{discount.name || "Discount"}</span>
                        <span className="font-medium text-green-600">
                          {discount.amount > 0 ? `-$${discount.amount.toFixed(2)}` : "Free Shipping"}
                        </span>
                      </div>
                    ))}
                    {discountDetails.length === 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600">Discount</span>
                        <span className="font-medium text-green-600">-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
                
                <Separator />
                <div className="flex justify-between items-center pt-1">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-emerald-600">${total.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="text-right text-sm text-green-600">
                    You saved: ${discountAmount.toFixed(2)}
                  </div>
                )}
                
                {/* Paid Amount */}
                {paidAmount > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-green-600 font-medium">✓ Paid Amount</span>
                    <span className="font-bold text-green-600">${paidAmount.toFixed(2)}</span>
                  </div>
                )}
                
                {/* Balance Due */}
                {(() => {
                  const balanceDue = Math.max(0, total - paidAmount);
                  const isPartiallyPaid = order.payment_status === 'partial_paid' || (paidAmount > 0 && paidAmount < total);
                  const canPay = balanceDue > 0 && (order.payment_status === 'unpaid' || order.payment_status === 'pending' || order.payment_status === 'partial_paid');
                  
                  return (
                    <>
                      {balanceDue > 0 ? (
                        <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex justify-between items-center">
                            <span className="text-red-600 font-bold">Balance Due</span>
                            <span className="text-xl font-bold text-red-600">${balanceDue.toFixed(2)}</span>
                          </div>
                          {canPay && (
                            <a href={`/pay-now?orderid=${order.id}`} target="_blank" rel="noopener noreferrer">
                              <Button className="w-full mt-3 bg-red-600 hover:bg-red-700">
                                <CreditCard className="w-4 h-4 mr-2" />
                                Pay Now - ${balanceDue.toFixed(2)}
                              </Button>
                            </a>
                          )}
                        </div>
                      ) : paidAmount > 0 && (
                        <div className="mt-2 p-2 bg-green-50 rounded-lg border border-green-200 text-center">
                          <span className="text-green-600 font-medium">✓ Fully Paid</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Special Instructions */}
            {order.specialInstructions && (
              <Card className="overflow-hidden border-0 shadow-sm border-l-4 border-l-blue-500">
                <CardContent className="p-4 bg-blue-50/50">
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-900 mb-1">Special Instructions</p>
                      <p className="text-gray-700 text-sm">{order.specialInstructions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Activity Timeline */}
            {order.id && (
              <OrderActivityTimeline orderId={order.id} />
            )}

            {/* Need Help */}
            <Card className="bg-gray-50 border-0">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-600 mb-2">Need help with this sales order?</p>
                <Button variant="outline" size="sm">
                  <Mail className="w-4 h-4 mr-1" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
