"use client"

import { useEffect, useRef, useState } from "react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
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
import Logo from "../../assests/home/9rx_logo.png"
import {
  AdminDocumentSettings,
  DEFAULT_ADMIN_DOCUMENT_SETTINGS,
  fetchAdminDocumentSettings,
  formatDocumentAddressLine,
} from "@/lib/documentSettings"

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
    sku?: string
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
    processing_fee_amount?: number
    payment_status: string
    payment_method: string
    payment_notes: string
    notes?: string
    created_at: string
    payment_transication: string
    // Discount fields
    discount_amount?: number
    discount_details?: any[]
    // Paid amount field
    paid_amount?: number
  }
}

const buildDiscountSummaryRows = (
  discountAmount: number,
  discountDetails: Array<{ name?: string; amount?: number }>
): string[][] => {
  if (discountAmount <= 0) {
    return []
  }

  if (!Array.isArray(discountDetails) || discountDetails.length === 0) {
    return [["Discount", `-$${discountAmount.toFixed(2)}`]]
  }

  const rows = discountDetails.map((discount) => {
    const amount = Number(discount?.amount || 0)
    return [discount?.name || "Discount", `-$${amount.toFixed(2)}`]
  })

  const detailedTotal = discountDetails.reduce((sum, discount) => sum + Number(discount?.amount || 0), 0)
  const remainder = Number((discountAmount - detailedTotal).toFixed(2))

  if (Math.abs(remainder) >= 0.01) {
    rows.push(["Discount", `-$${Math.abs(remainder).toFixed(2)}`])
  }

  return rows
}

const SUMMARY_BOTTOM_RESERVE = 58

const getInvoiceSizeLabel = (
  size: { size_value?: string | number | null; size_unit?: string | null },
  showUnit?: boolean | null
) => [size?.size_value, showUnit ? size?.size_unit : ""].filter(Boolean).join(" ").trim()

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const { toast } = useToast()
  const invoiceRef = useRef<HTMLDivElement>(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [documentSettings, setDocumentSettings] = useState<AdminDocumentSettings>(DEFAULT_ADMIN_DOCUMENT_SETTINGS)
  const [paidAmount, setPaidAmount] = useState(
    Number(invoice?.paid_amount || (invoice?.payment_status === "paid" ? (invoice?.total || invoice?.total_amount || 0) : 0))
  )
  const [processingFeeAmount, setProcessingFeeAmount] = useState(Number(invoice?.processing_fee_amount || 0))

  console.log("🧾 Rendering InvoicePreview with invoice:", invoice)
  console.log("💳 Payment Details:", {
    payment_status: invoice?.payment_status,
    payment_method: invoice?.payment_method,
    payment_transication: invoice?.payment_transication,
    payment_notes: invoice?.payment_notes,
    isPaid: invoice?.payment_status === "paid"
  })

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

  const fetchPaidAmount = async (): Promise<number> => {
    const fallbackTotalAmount = Number(invoice?.total || invoice?.total_amount || 0)
    let amount = Number(invoice?.paid_amount || 0)
    if (amount === 0 && invoice?.payment_status === "paid") {
      amount = fallbackTotalAmount
    }

    try {
      if (!invoice?.id) {
        setPaidAmount(amount)
        return amount
      }
      
      // First try to get from invoice table
      const invoiceRes = await supabase
        .from("invoices")
        .select("paid_amount, total_amount, payment_status, order_id")
        .eq("id", invoice.id)
        .maybeSingle()

      if (invoiceRes.error) {
        console.error("Error fetching invoice paid amount:", invoiceRes.error)
        setPaidAmount(amount)
        return amount
      }

      const invoiceData = invoiceRes.data as { paid_amount?: number; total_amount?: number; payment_status?: string; order_id?: string } | null
      
      amount = Number(invoiceData?.paid_amount || 0)
      
      // Always try to get latest from linked order (source of truth)
      if (invoiceData?.order_id) {
        const orderRes = await supabase
          .from("orders")
          .select("paid_amount, total_amount, payment_status")
          .eq("id", invoiceData.order_id)
          .maybeSingle()

        if (orderRes.error) {
          console.error("Error fetching order paid amount:", orderRes.error)
        }

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
      return amount
    } catch (error) {
      console.error("Error fetching paid amount:", error)
      setPaidAmount(amount)
      return amount
    }
  }

  const fetchProcessingFeeAmount = async (): Promise<number> => {
    const inlineFeeAmount = Number(invoice?.processing_fee_amount || 0)
    if (inlineFeeAmount > 0) {
      setProcessingFeeAmount(inlineFeeAmount)
      return inlineFeeAmount
    }

    try {
      if (invoice?.order_id) {
        const { data, error } = await supabase
          .from("orders")
          .select("processing_fee_amount, total_amount, subtotal, tax_amount, shipping_cost, discount_amount")
          .eq("id", invoice.order_id)
          .maybeSingle()

        if (!error && data) {
          const orderFeeAmount = Number((data as any)?.processing_fee_amount || 0)
          if (orderFeeAmount > 0) {
            setProcessingFeeAmount(orderFeeAmount)
            return orderFeeAmount
          }
        }
      }
    } catch (error) {
      console.error("Error fetching processing fee amount:", error)
    }

    const subtotalAmount = Number(invoice?.subtotal || 0)
    const taxAmount = Number(invoice?.tax || 0)
    const shippingCost = Number(invoice?.shippin_cost || 0)
    const discountAmount = Number((invoice as any)?.discount_amount || 0)
    const storedTotal = Number(invoice?.total || invoice?.total_amount || 0)
    const inferredFeeAmount = Number((storedTotal - (subtotalAmount + taxAmount + shippingCost - discountAmount)).toFixed(2))
    if (inferredFeeAmount > 0.009) {
      setProcessingFeeAmount(inferredFeeAmount)
      return inferredFeeAmount
    }

    setProcessingFeeAmount(0)
    return 0
  }

  const loadDocumentSettings = async () => {
    const settings = await fetchAdminDocumentSettings()
    setDocumentSettings(settings)
  }

  useEffect(() => { 
    setPaidAmount(
      Number(invoice?.paid_amount || (invoice?.payment_status === "paid" ? (invoice?.total || invoice?.total_amount || 0) : 0))
    )
    setProcessingFeeAmount(Number(invoice?.processing_fee_amount || 0))
    fetchUser()
    void loadDocumentSettings()
    void fetchPaidAmount()
    void fetchProcessingFeeAmount()
  }, [invoice])

  const invoiceCompany = documentSettings.invoice
  const invoiceCompanyName = invoiceCompany.name || DEFAULT_ADMIN_DOCUMENT_SETTINGS.invoice.name
  const invoiceAddressLine = formatDocumentAddressLine(invoiceCompany)
  const supportEmail = invoiceCompany.email || DEFAULT_ADMIN_DOCUMENT_SETTINGS.invoice.email

  const formattedDate = new Date(invoice.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC",
  })

  const isPaid = invoice?.payment_status === "paid"
  const isPartialPaid = invoice?.payment_status === "partial_paid"
  const showTransactionId = (isPaid || isPartialPaid) && invoice.payment_method === "card" && invoice?.payment_transication
  
  // Use stored total_amount if available, otherwise calculate
  const storedTotal = Number(invoice?.total || invoice?.total_amount || 0)
  const subtotalAmount = invoice?.subtotal || 0
  const taxAmount = Number(invoice?.tax || 0)
  const shippingCost = Number(invoice?.shippin_cost || 0)
  const discountDetails = (invoice as any)?.discount_details || []
  const discountDetailsTotal = discountDetails.reduce((sum: number, discount: any) => sum + Number(discount?.amount || 0), 0)
  const discountAmount = Math.max(Number((invoice as any)?.discount_amount || 0), discountDetailsTotal)
  const hasDiscountRows = discountAmount > 0 || discountDetails.length > 0
  
  // Calculate total - use stored total if available, otherwise calculate
   const calculatedTotal = subtotalAmount + taxAmount + shippingCost + processingFeeAmount - discountAmount
  const totalAmount = storedTotal > 0 ? storedTotal : calculatedTotal
  console.log("Invoice totals:", {
    subtotal: subtotalAmount,
    tax: taxAmount,
    shipping: shippingCost,
    discount: discountAmount,
    calculatedTotal,
    storedTotal,
    processingFee: processingFeeAmount,
    finalTotal: totalAmount,
    paidAmount
  })

  const loadPdfLogo = async () => {
    try {
      const logo = new Image()
      logo.src = Logo
      await new Promise<void>((resolve) => {
        logo.onload = () => resolve()
        logo.onerror = () => resolve()
        setTimeout(() => resolve(), 3000)
      })
      return logo.width > 0 ? logo : null
    } catch {
      return null
    }
  }

  const renderStandardPdfHeader = ({
    doc,
    pageWidth,
    margin,
    brandColor,
    darkGray,
    formattedDate,
    logo,
  }: {
    doc: any
    pageWidth: number
    margin: number
    brandColor: [number, number, number]
    darkGray: [number, number, number]
    formattedDate: string
    logo: HTMLImageElement | null
  }) => {
    const headerContentY = 10
    const leftColumnWidth = 64
    const rightColumnX = pageWidth - margin
    const rightColumnWidth = 62
    const leftInfoLines = [
      { text: invoiceCompanyName, bold: true, color: darkGray, fontSize: 11 },
      { text: invoiceCompany.street, color: [100, 100, 100] as [number, number, number], fontSize: 8.5 },
      { text: invoiceCompany.suite, color: [100, 100, 100] as [number, number, number], fontSize: 8.5 },
      { text: [[invoiceCompany.city, invoiceCompany.state, invoiceCompany.zipCode].filter(Boolean).join(", "), invoiceCompany.country].filter(Boolean).join(", "), color: [100, 100, 100] as [number, number, number], fontSize: 8.5 },
      { text: invoiceCompany.phone ? `Phone: ${invoiceCompany.phone}` : "", color: [100, 100, 100] as [number, number, number], fontSize: 8.5 },
      { text: invoiceCompany.email ? `Email: ${invoiceCompany.email}` : "", color: [100, 100, 100] as [number, number, number], fontSize: 8.5 },
      { text: invoiceCompany.taxId ? `Tax ID: ${invoiceCompany.taxId}` : "", color: [100, 100, 100] as [number, number, number], fontSize: 8.5 },
      { text: invoiceCompany.website || "", color: [100, 100, 100] as [number, number, number], fontSize: 8.5 },
    ].filter((line) => line.text)

    doc.setFillColor(...brandColor)
    doc.rect(0, 0, pageWidth, 5, "F")

    let addressY = headerContentY + 3
    leftInfoLines.forEach((line, index) => {
      doc.setFont("helvetica", line.bold ? "bold" : "normal")
      doc.setFontSize(line.fontSize)
      doc.setTextColor(...line.color)
      const wrappedLines = doc.splitTextToSize(line.text, leftColumnWidth)
      doc.text(wrappedLines, margin, addressY)
      addressY += wrappedLines.length * (index === 0 ? 4.4 : 3.6)
    })

    let logoBottomY = headerContentY
    if (logo) {
      const logoHeight = 26
      const logoWidth = (logo.width / logo.height) * logoHeight
      doc.addImage(logo, "PNG", pageWidth / 2 - logoWidth / 2, headerContentY, logoWidth, logoHeight)
      logoBottomY = headerContentY + logoHeight
    } else {
      doc.setFont("helvetica", "bold")
      doc.setFontSize(18)
      doc.setTextColor(...darkGray)
      doc.text(invoiceCompanyName, pageWidth / 2, headerContentY + 10, { align: "center" })
      logoBottomY = headerContentY + 10
    }

    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.setTextColor(...brandColor)
    doc.text("INVOICE", rightColumnX, headerContentY + 4, { align: "right", maxWidth: rightColumnWidth })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...darkGray)
    let detailsY = headerContentY + 10
    doc.text(`# ${invoice.invoice_number}`, rightColumnX, detailsY, { align: "right", maxWidth: rightColumnWidth })

    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    detailsY += 6
    doc.text(`Date: ${formattedDate}`, rightColumnX, detailsY, { align: "right", maxWidth: rightColumnWidth })

    if (invoice.order_number) {
      detailsY += 6
      doc.text(`SO Ref: ${invoice.order_number}`, rightColumnX, detailsY, { align: "right", maxWidth: rightColumnWidth })
    }

    const badgeLabel = isPaid ? "PAID" : "UNPAID"
    const badgeColor: [number, number, number] = isPaid ? [34, 197, 94] : [239, 68, 68]
    const badgeWidth = badgeLabel === "PAID" ? 25 : 30
    const badgeY = detailsY + 2
    doc.setFillColor(...badgeColor)
    doc.roundedRect(rightColumnX - badgeWidth, badgeY, badgeWidth, 8, 2, 2, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.text(badgeLabel, rightColumnX - badgeWidth / 2, badgeY + 5.5, { align: "center" })

    const dividerY = Math.max(addressY, logoBottomY, badgeY + 8) + 1
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.5)
    doc.line(margin, dividerY, pageWidth - margin, dividerY)

    return dividerY
  }

  const buildStructuredPdfTableOptions = ({
    doc,
    pageWidth,
    pageHeight,
    margin,
    brandColor,
    tableHead,
    tableBody,
    tableStartY,
    totalValue,
  }: {
    doc: any
    pageWidth: number
    pageHeight: number
    margin: number
    brandColor: [number, number, number]
    tableHead: string[][]
    tableBody: any[]
    tableStartY: number
    totalValue: string
  }) => {
    const bodyWithTotal = [...tableBody, ["", "", "", "", "TOTAL:", totalValue]]

    return {
      head: tableHead,
      body: bodyWithTotal,
      startY: tableStartY,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [226, 232, 240] as [number, number, number],
        lineWidth: 0.2,
        textColor: [75, 85, 99] as [number, number, number],
        fillColor: [255, 255, 255] as [number, number, number],
      },
      headStyles: {
        fillColor: brandColor,
        textColor: 255,
        fontStyle: "bold",
        halign: "center",
        valign: "middle",
      },
      bodyStyles: {
        fillColor: [255, 255, 255] as [number, number, number],
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 22 },
        1: { cellWidth: "auto" },
        2: { halign: "center", cellWidth: 25 },
        3: { halign: "center", cellWidth: 15 },
        4: { halign: "right", cellWidth: 25 },
        5: { halign: "right", cellWidth: 25 },
      },
      margin: { left: margin, right: margin, bottom: 45 },
      tableWidth: "auto",
      showHead: "everyPage" as const,
      didParseCell: (data: any) => {
        if (data.section === "body" && data.row.index === bodyWithTotal.length - 1) {
          data.cell.styles.fillColor = [248, 250, 252]
          data.cell.styles.fontStyle = data.column.index >= 4 ? "bold" : "normal"
        }
      },
      didDrawPage: () => {
        doc.setFillColor(...brandColor)
        doc.rect(0, 0, pageWidth, 5, "F")
        doc.setFillColor(...brandColor)
        doc.rect(0, pageHeight - 2, pageWidth, 2, "F")
      },
    }
  }

  const drawInvoiceFooter = (
    doc: jsPDF,
    {
      pageNumber,
      totalPages,
      pageWidth,
      pageHeight,
      margin,
      brandColor,
      invoiceNote,
    }: {
      pageNumber: number
      totalPages: number
      pageWidth: number
      pageHeight: number
      margin: number
      brandColor: [number, number, number]
      invoiceNote?: string
    }
  ) => {
    const footerY = pageHeight - 20
    let detailLine = `Payment Terms: Net 30  |  Questions? Contact us at ${supportEmail}`

    if (showTransactionId) {
      detailLine = `Transaction ID: ${invoice.payment_transication}  |  Questions? Contact us at ${supportEmail}`
    } else if (invoiceNote) {
      detailLine = `Invoice Notes: ${invoiceNote}  |  Questions? Contact us at ${supportEmail}`
    } else if (isPaid || isPartialPaid) {
      detailLine = invoice?.payment_notes
        ? `Payment Notes: ${invoice.payment_notes}  |  Questions? Contact us at ${supportEmail}`
        : `Payment Received  |  Questions? Contact us at ${supportEmail}`
    }

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
    doc.text(detailLine, pageWidth / 2, footerY + 6, { align: "center" })

    doc.setFillColor(...brandColor)
    doc.rect(0, pageHeight - 2, pageWidth, 2, "F")

    doc.setFillColor(255, 255, 255)
    doc.rect(pageWidth / 2 - 20, pageHeight - 9, 40, 6, "F")

    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth / 2, pageHeight - 4.5, { align: "center" })
  }

  const drawSummaryBar = (
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    label: string,
    value: string | null,
    tone: "total" | "paid" | "due"
  ) => {
    const styles = {
      total: { fill: [239, 243, 255] as [number, number, number], text: [40, 56, 136] as [number, number, number] },
      paid: { fill: [240, 253, 244] as [number, number, number], text: [22, 163, 74] as [number, number, number] },
      due: { fill: [254, 242, 242] as [number, number, number], text: [220, 38, 38] as [number, number, number] },
    }[tone]

    doc.setFillColor(...styles.fill)
    doc.roundedRect(x, y, width, 10, 1, 1, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(...styles.text)

    if (value) {
      doc.text(label, x + 5, y + 7)
      doc.text(value, x + width - 5, y + 7, { align: "right" })
    } else {
      doc.text(label, x + width / 2, y + 7, { align: "center" })
    }
  }

  // Download PDF with same format as admin/pharmacy
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const resolvedPaidAmount = await fetchPaidAmount()
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 12

      const brandColor: [number, number, number] = [40, 56, 136]
      const darkGray: [number, number, number] = [60, 60, 60]
      const lightGray: [number, number, number] = [245, 245, 245]
      const logo = await loadPdfLogo()
      const dividerY = renderStandardPdfHeader({
        doc,
        pageWidth,
        margin,
        brandColor,
        darkGray,
        formattedDate,
        logo,
      })

      // ===== BILL TO / SHIP TO SECTION =====
      const infoStartY = dividerY + 5
      const boxWidth = (pageWidth - margin * 3) / 2
      const lineHeight = 4.6
      const measureInfoBox = (lines: string[]) => {
        const visibleLines = lines.filter(Boolean).slice(0, 5)
        const wrappedLines = visibleLines.flatMap((line) => doc.splitTextToSize(line, boxWidth - 10))
        const boxHeight = Math.max(29, 12 + wrappedLines.length * lineHeight + 4)
        return { visibleLines, boxHeight }
      }
      const drawInfoBox = (
        title: string,
        x: number,
        measured: { visibleLines: string[]; boxHeight: number },
        sharedHeight: number,
      ) => {
        doc.setFillColor(...lightGray)
        doc.roundedRect(x, infoStartY, boxWidth, sharedHeight, 2, 2, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(...brandColor)
        doc.text(title, x + 5, infoStartY + 6)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(...darkGray)
        let y = infoStartY + 11.5
        measured.visibleLines.forEach((line) => {
          const lineParts = doc.splitTextToSize(line, boxWidth - 10)
          doc.text(lineParts, x + 5, y)
          y += lineParts.length * lineHeight
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

      const billToLayout = measureInfoBox(billToLines)
      const shipToLayout = measureInfoBox(shipToLines)
      const sharedInfoBoxHeight = Math.max(billToLayout.boxHeight, shipToLayout.boxHeight)
      drawInfoBox("BILL TO", margin, billToLayout, sharedInfoBoxHeight)
      drawInfoBox("SHIP TO", margin * 2 + boxWidth, shipToLayout, sharedInfoBoxHeight)
      const infoBottomY = infoStartY + sharedInfoBoxHeight

      // ===== ITEMS TABLE =====
      const tableStartY = infoBottomY + 7
      const tableHead = [["SKU", "Description", "Size", "Qty", "Unit Price", "Total"]]
      const tableBody: any[] = []
      let itemsGrandTotal = 0

      if (invoice?.items && Array.isArray(invoice.items)) {
        invoice.items.forEach((item: any) => {
          if (Array.isArray(item.sizes)) {
            item.sizes.forEach((size: any, sizeIndex: number) => {
              const lineTotal = Number(size.price * size.quantity)
              tableBody.push([
                size.sku || item.sku || '',
                size.size_name || item.name,
                getInvoiceSizeLabel(size, (item as any).unitToggle),
                size.quantity?.toString() || '0',
                `$${Number(size.price).toFixed(2)}`,
                `$${lineTotal.toFixed(2)}`
              ])
              itemsGrandTotal += lineTotal
              if (false && sizeIndex === 0 && item.description && item.description.trim()) {
                tableBody.push(["", { content: `↳ ${item.description.trim()}`, styles: { fontStyle: "italic", textColor: [120, 120, 120], fontSize: 8 } }, "", "", "", ""])
              }
            })
          }
        })
      }

      autoTable(doc as any, buildStructuredPdfTableOptions({
        doc,
        pageWidth,
        pageHeight,
        margin,
        brandColor,
        tableHead,
        tableBody,
        tableStartY,
        totalValue: `$${itemsGrandTotal.toFixed(2)}`,
      }))

      let finalY = (doc as any).lastAutoTable.finalY + 8

      // ===== SUMMARY SECTION =====
      const shippingCost = Number(invoice?.shippin_cost || 0)
      const taxAmount = invoice?.tax || 0
      const invoiceDiscountAmount = Number((invoice as any)?.discount_amount || 0)
      const invoiceDiscountDetails = (invoice as any)?.discount_details || []
      // Use stored total_amount if available, otherwise calculate
      const calculatedTotal = subtotalAmount + shippingCost + taxAmount - invoiceDiscountAmount
      // Build summary body with discount if applicable
      const resolvedProcessingFeeAmount = await fetchProcessingFeeAmount()
      // Include processing fee in total since the customer was charged for it
      // const pdfTotalAmount = totalAmount > 0 ? (totalAmount - processingFeeAmount + resolvedProcessingFeeAmount) : (calculatedTotal + resolvedProcessingFeeAmount)


            const pdfTotalAmount = storedTotal > 0 ? storedTotal : (subtotalAmount + shippingCost + taxAmount + resolvedProcessingFeeAmount - invoiceDiscountAmount)

      const invoiceSummaryBody: any[] = [["Subtotal", `$${subtotalAmount.toFixed(2)}`], ["Shipping", `$${shippingCost.toFixed(2)}`], ["Tax", `$${taxAmount.toFixed(2)}`]]
      let firstDiscountRowIndex: number | null = null

      if (resolvedProcessingFeeAmount > 0) {
        invoiceSummaryBody.push(["Credit Card Processing Fee", `$${resolvedProcessingFeeAmount.toFixed(2)}`])
      }
      if (invoiceDiscountAmount > 0) {
        firstDiscountRowIndex = invoiceSummaryBody.length
        invoiceSummaryBody.push(...buildDiscountSummaryRows(invoiceDiscountAmount, invoiceDiscountDetails))
      }

      const balanceDue = Math.max(0, pdfTotalAmount - resolvedPaidAmount)

      autoTable(doc as any, {
        body: invoiceSummaryBody,
        startY: finalY, theme: "plain", styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { halign: "right", cellWidth: 45 }, 1: { halign: "right", cellWidth: 35, fontStyle: "normal" } },
        margin: { left: pageWidth - margin - 85, bottom: SUMMARY_BOTTOM_RESERVE }, tableWidth: 80,
        didDrawCell: (data: any) => {
          if (data.section === "body" && data.column.index === 0 && data.row.index === firstDiscountRowIndex) {
            doc.setDrawColor(220, 220, 220)
            doc.setLineWidth(0.3)
            doc.line(data.cell.x, data.cell.y, data.cell.x + 80, data.cell.y)
          }
        },
      })

      let summaryFinalY = (doc as any).lastAutoTable.finalY
      if (summaryFinalY + 38 > pageHeight - 30) {
        doc.addPage()
        doc.setFillColor(...brandColor)
        doc.rect(0, 0, pageWidth, 5, "F")
        doc.setFillColor(...brandColor)
        doc.rect(0, pageHeight - 2, pageWidth, 2, "F")
        summaryFinalY = 20
      }
      drawSummaryBar(doc, pageWidth - margin - 85, summaryFinalY + 2, 80, "TOTAL", `$${pdfTotalAmount.toFixed(2)}`, "total")

      // Add Paid Amount and Balance Due
      let paidAmountY = summaryFinalY + 14
      if (resolvedPaidAmount > 0) {
        drawSummaryBar(doc, pageWidth - margin - 85, paidAmountY, 80, "PAID AMOUNT", `$${resolvedPaidAmount.toFixed(2)}`, "paid")
        paidAmountY += 12
      }
      
      if (balanceDue > 0) {
        drawSummaryBar(doc, pageWidth - margin - 85, paidAmountY, 80, "BALANCE DUE", `$${balanceDue.toFixed(2)}`, "due")
      } else if (resolvedPaidAmount > 0) {
        drawSummaryBar(doc, pageWidth - margin - 85, paidAmountY, 80, "FULLY PAID", null, "paid")
      }

      const pdfInvoiceNote = invoice?.notes?.trim()
      // Add footer and page numbers to all pages
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        drawInvoiceFooter(doc, {
          pageNumber: i,
          totalPages,
          pageWidth,
          pageHeight,
          margin,
          brandColor,
          invoiceNote: pdfInvoiceNote,
        })
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
      const resolvedPaidAmount = await fetchPaidAmount()
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 12
      const brandColor: [number, number, number] = [40, 56, 136]
      const darkGray: [number, number, number] = [60, 60, 60]
      const lightGray: [number, number, number] = [245, 245, 245]
      const logo = await loadPdfLogo()
      const dividerY = renderStandardPdfHeader({
        doc,
        pageWidth,
        margin,
        brandColor,
        darkGray,
        formattedDate,
        logo,
      })

      const infoStartY = dividerY + 5
      const boxWidth = (pageWidth - margin * 3) / 2
      const lineHeight = 4.6
      const measureInfoBox = (lines: string[]) => {
        const visibleLines = lines.filter(Boolean).slice(0, 5)
        const wrappedLines = visibleLines.flatMap((line) => doc.splitTextToSize(line, boxWidth - 10))
        const boxHeight = Math.max(29, 12 + wrappedLines.length * lineHeight + 4)
        return { visibleLines, boxHeight }
      }
      const drawInfoBox = (
        title: string,
        x: number,
        measured: { visibleLines: string[]; boxHeight: number },
        sharedHeight: number,
      ) => {
        doc.setFillColor(...lightGray)
        doc.roundedRect(x, infoStartY, boxWidth, sharedHeight, 2, 2, "F")
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.setTextColor(...brandColor)
        doc.text(title, x + 5, infoStartY + 6)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)
        doc.setTextColor(...darkGray)
        let y = infoStartY + 11.5
        measured.visibleLines.forEach((line) => {
          const lineParts = doc.splitTextToSize(line, boxWidth - 10)
          doc.text(lineParts, x + 5, y)
          y += lineParts.length * lineHeight
        })
      }

      const billToLines = [companyName, invoice.customerInfo?.name, invoice.customerInfo?.phone, invoice.customerInfo?.email,
        [invoice.customerInfo?.address?.street, invoice.customerInfo?.address?.city, invoice.customerInfo?.address?.state, invoice.customerInfo?.address?.zip_code].filter(Boolean).join(", ")].filter(Boolean) as string[]
      const shipToLines = [companyName, invoice.shippingInfo?.fullName, invoice.shippingInfo?.phone,
        [invoice.shippingInfo?.address?.street, invoice.shippingInfo?.address?.city, invoice.shippingInfo?.address?.state, invoice.shippingInfo?.address?.zip_code].filter(Boolean).join(", ")].filter(Boolean) as string[]

      const billToLayout = measureInfoBox(billToLines)
      const shipToLayout = measureInfoBox(shipToLines)
      const sharedInfoBoxHeight = Math.max(billToLayout.boxHeight, shipToLayout.boxHeight)
      drawInfoBox("BILL TO", margin, billToLayout, sharedInfoBoxHeight)
      drawInfoBox("SHIP TO", margin * 2 + boxWidth, shipToLayout, sharedInfoBoxHeight)
      const infoBottomY = infoStartY + sharedInfoBoxHeight

      const tableStartY = infoBottomY + 7
      const tableHead = [["SKU", "Description", "Size", "Qty", "Unit Price", "Total"]]
      const tableBody: any[] = []
      let itemsGrandTotal = 0
      if (invoice?.items && Array.isArray(invoice.items)) {
        invoice.items.forEach((item: any) => {
          if (Array.isArray(item.sizes)) {
            item.sizes.forEach((size: any, sizeIndex: number) => {
              const lineTotal = Number(size.price * size.quantity)
              tableBody.push([size.sku || item.sku || '', size.size_name || item.name, getInvoiceSizeLabel(size, (item as any).unitToggle), size.quantity?.toString() || '0', `$${Number(size.price).toFixed(2)}`, `$${lineTotal.toFixed(2)}`])
              itemsGrandTotal += lineTotal
              if (false && sizeIndex === 0 && item.description && item.description.trim()) {
                tableBody.push(["", { content: `↳ ${item.description.trim()}`, styles: { fontStyle: "italic", textColor: [120, 120, 120], fontSize: 8 } }, "", "", "", ""])
              }
            })
          }
        })
      }

      autoTable(doc as any, buildStructuredPdfTableOptions({
        doc,
        pageWidth,
        pageHeight,
        margin,
        brandColor,
        tableHead,
        tableBody,
        tableStartY,
        totalValue: `$${itemsGrandTotal.toFixed(2)}`,
      }))

      let finalY = (doc as any).lastAutoTable.finalY + 8

      const shippingCost = Number(invoice?.shippin_cost || 0)
      const taxAmount = invoice?.tax || 0
      const printDiscountAmount = Number((invoice as any)?.discount_amount || 0)
      const printDiscountDetails = (invoice as any)?.discount_details || []
      // Use stored total_amount if available, otherwise calculate
      const printCalculatedTotal = subtotalAmount + shippingCost + taxAmount - printDiscountAmount
      // Build summary body with discount if applicable
      const resolvedProcessingFeeAmount = await fetchProcessingFeeAmount()
      // Include processing fee in total since the customer was charged for it
      // const pdfTotalAmount = totalAmount > 0 ? (totalAmount - processingFeeAmount + resolvedProcessingFeeAmount) : (printCalculatedTotal + resolvedProcessingFeeAmount)


            const pdfTotalAmount = storedTotal > 0 ? storedTotal : (subtotalAmount + shippingCost + taxAmount + resolvedProcessingFeeAmount - printDiscountAmount)

      const printSummaryBody: any[] = [["Subtotal", `$${subtotalAmount.toFixed(2)}`], ["Shipping", `$${shippingCost.toFixed(2)}`], ["Tax", `$${taxAmount.toFixed(2)}`]]
      let printFirstDiscountRowIndex: number | null = null

      if (resolvedProcessingFeeAmount > 0) {
        printSummaryBody.push(["Credit Card Processing Fee", `$${resolvedProcessingFeeAmount.toFixed(2)}`])
      }
      if (printDiscountAmount > 0) {
        printFirstDiscountRowIndex = printSummaryBody.length
        printSummaryBody.push(...buildDiscountSummaryRows(printDiscountAmount, printDiscountDetails))
      }

      const printBalanceDue = Math.max(0, pdfTotalAmount - resolvedPaidAmount)

      autoTable(doc as any, {
        body: printSummaryBody,
        startY: finalY, theme: "plain", styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: { 0: { halign: "right", cellWidth: 45 }, 1: { halign: "right", cellWidth: 35 } },
        margin: { left: pageWidth - margin - 85, bottom: SUMMARY_BOTTOM_RESERVE }, tableWidth: 80,
        didDrawCell: (data: any) => {
          if (data.section === "body" && data.column.index === 0 && data.row.index === printFirstDiscountRowIndex) {
            doc.setDrawColor(220, 220, 220)
            doc.setLineWidth(0.3)
            doc.line(data.cell.x, data.cell.y, data.cell.x + 80, data.cell.y)
          }
        },
      })

      let summaryFinalY = (doc as any).lastAutoTable.finalY
      if (summaryFinalY + 38 > pageHeight - 30) {
        doc.addPage()
        doc.setFillColor(...brandColor)
        doc.rect(0, 0, pageWidth, 5, "F")
        doc.setFillColor(...brandColor)
        doc.rect(0, pageHeight - 2, pageWidth, 2, "F")
        summaryFinalY = 20
      }
      drawSummaryBar(doc, pageWidth - margin - 85, summaryFinalY + 2, 80, "TOTAL", `$${pdfTotalAmount.toFixed(2)}`, "total")

      // Add Paid Amount and Balance Due for Print
      let printPaidAmountY = summaryFinalY + 14
      if (resolvedPaidAmount > 0) {
        drawSummaryBar(doc, pageWidth - margin - 85, printPaidAmountY, 80, "PAID AMOUNT", `$${resolvedPaidAmount.toFixed(2)}`, "paid")
        printPaidAmountY += 12
      }
      
      if (printBalanceDue > 0) {
        drawSummaryBar(doc, pageWidth - margin - 85, printPaidAmountY, 80, "BALANCE DUE", `$${printBalanceDue.toFixed(2)}`, "due")
      } else if (resolvedPaidAmount > 0) {
        drawSummaryBar(doc, pageWidth - margin - 85, printPaidAmountY, 80, "FULLY PAID", null, "paid")
      }

      const printInvoiceNote = invoice?.notes?.trim()
      // Add footer and page numbers to all pages
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        drawInvoiceFooter(doc, {
          pageNumber: i,
          totalPages,
          pageWidth,
          pageHeight,
          margin,
          brandColor,
          invoiceNote: printInvoiceNote,
        })
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
              <div className="flex items-center gap-1.5"><Building className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" /><span>Tax ID: {invoiceCompany.taxId || "N/A"}</span></div>
              <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" /><span>{invoiceAddressLine}</span></div>
              <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" /><span>{invoiceCompany.phone || "N/A"}</span></div>
              <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" /><span>{supportEmail}</span></div>
              <div className="flex items-center gap-1.5"><Globe className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" /><span>{invoiceCompany.website || "N/A"}</span></div>
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
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-10">Sku</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-left">Description</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Size</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Qty</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center whitespace-nowrap">Unit Price</th>
                  <th className="px-2 sm:px-4 py-2 sm:py-3 text-center">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice?.items?.flatMap((item, itemIndex) => 
                  item.sizes?.map((size: any, sizeIndex: number) => {
                    // Calculate the actual row number across all items and sizes
                    const rowNumber = invoice.items
                      .slice(0, itemIndex)
                      .reduce((acc, prevItem) => acc + (prevItem.sizes?.length || 0), 0) + sizeIndex + 1;
                    
                    return (
                      <tr key={`item-${itemIndex}-${sizeIndex}`} className="hover:bg-gray-50">
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center text-gray-600">{size.sku}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-gray-800">{size.size_name || item.name}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center text-gray-700">{getInvoiceSizeLabel(size, (item as any).unitToggle)}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center text-gray-700">{size.quantity}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center text-gray-700">${Number(size.price).toFixed(2)}</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm text-center font-medium text-gray-900">${Number(size.quantity * size.price).toFixed(2)}</td>
                      </tr>
                    );
                  }) || []
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
              {(() => {
                console.log("💳 Transaction ID Display Check:", {
                  isPaid,
                  payment_status: invoice?.payment_status,
                  payment_method: invoice.payment_method,
                  payment_transication: invoice?.payment_transication,
                  shouldShowTransactionId: (isPaid || invoice?.payment_status === 'partial_paid') && invoice.payment_method === "card",
                  transactionIdValue: invoice?.payment_transication || "NOT FOUND"
                });
                return null;
              })()}
              {(isPaid || invoice?.payment_status === 'partial_paid') && (
                <div className="p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    {invoice.payment_method === "card" ? <><CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Transaction ID:</> : <><Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Payment Notes:</>}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 font-mono bg-white px-2 sm:px-3 py-1.5 sm:py-2 rounded border break-all">
                    {invoice.payment_method === "card" ? (invoice?.payment_transication || "N/A") : (invoice?.payment_notes || "N/A")}
                  </p>
                </div>
              )}
              {invoice?.notes && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-blue-700 mb-1">
                    <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Invoice Notes
                  </div>
                  <p className="text-xs sm:text-sm text-blue-900 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-0 shadow-sm">
            <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="flex justify-between text-xs sm:text-sm"><span className="text-gray-600">Sub Total</span><span className="font-medium text-gray-900">${subtotalAmount.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs sm:text-sm"><span className="text-gray-600">Tax</span><span className="font-medium text-gray-900">${(invoice?.tax || 0).toFixed(2)}</span></div>
              <div className="flex justify-between text-xs sm:text-sm"><span className="text-gray-600">Shipping Cost</span><span className="font-medium text-gray-900">${Number(invoice?.shippin_cost || 0).toFixed(2)}</span></div>
              {processingFeeAmount > 0 && (
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Credit Card Processing Fee</span>
                  <span className="font-medium text-gray-900">${processingFeeAmount.toFixed(2)}</span>
                </div>
              )}
              {/* Show discount if applied */}
              {hasDiscountRows && (
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
              <div className="flex justify-between"><span className="font-semibold text-sm sm:text-base text-gray-900">Total</span><span className="font-bold text-base sm:text-lg text-gray-900">${totalAmount.toFixed(2)}</span></div>
              {hasDiscountRows && (
                <div className="text-right text-sm text-green-600">
                  You saved: ${discountAmount.toFixed(2)}
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

