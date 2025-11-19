import { Invoice } from "../types/invoice.types";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import React from "react";
import InvoiceExport from "./InvoiceExport"
import { CSVLink } from "react-csv";

// Extend the jsPDF type to include autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => void;
  lastAutoTable: {
    finalY: number;
  };
}

interface ExportOptionsProps {
  invoices: Invoice[];
}

export const exportToPDF = (invoice?: Invoice) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  const invoicesToExport = invoice ? [invoice] : [];

  invoicesToExport.forEach((inv, index) => {
    if (index > 0) {
      doc.addPage();
    }

    // Add header
    doc.setFontSize(20);
    doc.text("Invoice", 20, 20);
    doc.setFontSize(12);
    doc.text(`Invoice #: ${inv.invoice_number}`, 20, 30);
    doc.text(`Date: ${inv.due_date}`, 20, 40);

    // Add customer info
    const customerInfo = typeof inv.customer_info === 'string' 
      ? JSON.parse(inv.customer_info)
      : inv.customer_info;
    
    doc.text("Bill To:", 20, 60);
    doc.text(customerInfo.name || '', 20, 70);
    doc.text(customerInfo.email || '', 20, 80);

    // Add items table
    const tableColumn = ["Item", "Quantity", "Price", "Total"];
    const items = Array.isArray(inv.items) ? inv.items : [];
    const tableRows = items.map(item => [
      item.description,
      item.quantity.toString(),
      `$${item.rate.toFixed(2)}`,
      `$${item.amount.toFixed(2)}`
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 100,
    });

    // Add totals
    const finalY = doc.lastAutoTable.finalY || 150;
    doc.text(`Subtotal: $${inv.subtotal.toFixed(2)}`, 140, finalY + 20);
    doc.text(`Tax: $${inv.tax_amount?.toFixed(2) || '0.00'}`, 140, finalY + 30);
    doc.text(`Total: $${inv.total_amount.toFixed(2)}`, 140, finalY + 40);
  });

  doc.save(`invoice${invoice ? `-${invoice.id}` : 's'}.pdf`);
};




export const ExportOptions: React.FC<ExportOptionsProps> = ({ invoices }) => {
  return (
    <div className="flex items-center gap-2">
 
      <InvoiceExport invoices={invoices} companyName="9RX" logoUrl="/final.png" />
    </div>
  );
};
