import type React from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import jsPDF from "jspdf"
import "jspdf-autotable"
import type { Invoice } from "../types/invoice.types"

// Extend the jsPDF type to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => void
  lastAutoTable: {
    finalY: number
  }
}

interface InvoiceExportProps {
  invoices: Invoice[]
  companyName: string
  logoUrl: string
}

const InvoiceExport: React.FC<InvoiceExportProps> = ({ invoices, companyName, logoUrl }) => {
  const exportToPDF = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable
console.log(invoices)
    invoices.forEach((inv, index) => {
      if (index > 0) {
        doc.addPage()
      }

      // Add logo
      doc.addImage(logoUrl, "PNG", 20, 20, 40, 40)

      // Add company name
      doc.setFontSize(24)
      doc.setTextColor(44, 62, 80)
      doc.text(companyName, 70, 40)

      // Add invoice details
      doc.setFontSize(12)
      doc.setTextColor(52, 73, 94)
      doc.text(`Invoice #: ${inv.invoice_number}`, 20, 70)
      doc.text(`Date: ${new Date(inv.created_at).toLocaleDateString()}`, 20, 80)
      doc.text(`Due Date: ${new Date(inv.due_date).toLocaleDateString()}`, 20, 90)

      // Add customer info
      const customerInfo = typeof inv.customer_info === "string" ? JSON.parse(inv.customer_info) : inv.customer_info

      doc.setFontSize(14)
      doc.setTextColor(41, 128, 185)
      doc.text("Bill To:", 20, 110)
      doc.setFontSize(12)
      doc.setTextColor(52, 73, 94)
      doc.text(customerInfo.name || "", 20, 120)
      doc.text(customerInfo.email || "", 20, 130)
      doc.text(customerInfo.address?.street || "", 20, 140)
      doc.text(
        `${customerInfo.address?.city || ""}, ${customerInfo.address?.state || ""} ${customerInfo.address?.zip || ""}`,
        20,
        150,
      )

      // Add items table
      const tableColumn = ["Item", "Quantity", "Price", "Total"]
      const items = Array.isArray(inv.items) ? inv.items : []
      const tableRows = items?.map((item) => [
        item.description,
        item?.quantity?.toString(),
        `$${item?.rate?.toFixed(2)}`,
        `$${item?.amount?.toFixed(2)}`,
      ])

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 170,
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        bodyStyles: { textColor: 50 },
      })

      // Add totals
      const finalY = doc.lastAutoTable.finalY || 200
      doc.setFontSize(12)
      doc.text(`Subtotal: $${inv.subtotal.toFixed(2)}`, 140, finalY + 20)
      doc.text(`Tax: $${inv.tax_amount?.toFixed(2) || "0.00"}`, 140, finalY + 30)
      doc.setFontSize(14)
      doc.setTextColor(41, 128, 185)
      doc.text(`Total: $${inv.total_amount?.toFixed(2)}`, 140, finalY + 40)

      // Add footer
      doc.setFontSize(10)
      doc.setTextColor(127, 140, 141)
      doc.text(`Thank you for your business!`, 20, 280)
      doc.text(`${companyName} | Page ${index + 1} of ${invoices.length}`, 20, 285)
    })
console.log("first")
    doc.save(`invoices.pdf`)
  }

  return (
    <Button onClick={exportToPDF} className="flex items-center gap-2 hidden">
      <Download className="h-4 w-4" />
      Export All Invoices
    </Button>
  )
}

export default InvoiceExport

