import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateWorkOrderPDF = async (workOrderData, packingData) => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    // Add Logo (Left side) - Same as PO
    const logo = new Image();
    logo.src = "/final.png";
    await new Promise((resolve) => (logo.onload = resolve));
    const logoHeight = 25;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    doc.addImage(logo, "PNG", margin, margin, logoWidth, logoHeight);

    // Set Fonts
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    // Top Info Line (All in one row, top line) - Same as PO
    const topInfo = [
      "Tax ID : 99-0540972",
      "936 Broad River Ln, Charlotte, NC 28211",
      "info@9rx.com",
      "www.9rx.com"
    ].join("     |     ");
    doc.text(topInfo, pageWidth / 2, margin - 2, { align: "center" });

    // Centered Phone Number (under logo) - Same as PO
    doc.setFontSize(10);
    doc.text("+1 800 969 6295", pageWidth / 2, margin + logoHeight / 2 + 5, { align: "center" });

    // PACKING SLIP TITLE (right side) - Changed from "PURCHASE ORDER"
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("PACKING SLIP", pageWidth - margin - 10, margin + 10, { align: "right" });

    // Order Number and Date - Using workOrderData if available, fallback to packingData
    doc.setFontSize(10);
    const orderNumber = workOrderData?.order_number || packingData?.order_number || "N/A";
    const formattedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    doc.text(`ORDER - ${orderNumber}`, pageWidth - margin - 10, margin + 15, { align: "right" });
    doc.text(`Date - ${formattedDate}`, pageWidth - margin - 10, margin + 20, { align: "right" });

    // Divider line - Same as PO
    doc.setDrawColor(200);
    doc.line(margin, margin + 26, pageWidth - margin, margin + 26);

    // Addresses - Only "Ship To" for Packing Slip
    const infoStartY = margin + 35;

    // No "Bill To" section for Packing Slip, only "Ship To" shifted to the left
    doc.setFont("helvetica", "bold").setFontSize(11).text("Ship To", margin, infoStartY); // Changed x-coordinate
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("9RX", margin, infoStartY + 5);
    doc.text(packingData?.shippingAddress?.fullName || "N/A", margin, infoStartY + 10);
    doc.text(packingData?.shippingAddress?.phone || "N/A", margin, infoStartY + 15);
    doc.text(packingData?.shippingAddress?.email || "N/A", margin, infoStartY + 20);
    doc.text(
      `${packingData?.shippingAddress?.address?.street || ""} ${packingData?.shippingAddress?.address?.city || ""}, ${packingData?.shippingAddress?.address?.state || ""} ${packingData?.shippingAddress?.address?.zip_code || ""}`,
      margin, // Changed x-coordinate
      infoStartY + 25,
      { maxWidth: contentWidth / 2 }
    );

    doc.line(margin, infoStartY + 35, pageWidth - margin, infoStartY + 35);

    // Items Table - Simplified for Packing Slip (Description, Size, Qty)
    const tableStartY = infoStartY + 45;
    const tableHead = [["Description", "Size", "Qty"]]; // Removed Price/Unit and Total

    const tableBody = [];

    // Assuming packingData.items has a similar structure to currentOrder.items for sizes and quantities
    packingData.items.forEach((item) => {
      item.sizes.forEach((size) => {
        const description = item.name;
        const sizeValueUnit = `${size.size_value} ${size.size_unit}`;
        const quantity = size.quantity.toString();

        tableBody.push([
          description,
          sizeValueUnit,
          quantity,
        ]);
      });
    });

    (doc as any).autoTable({
      head: tableHead,
      body: tableBody,
      startY: tableStartY,
      styles: { fontSize: 9 },
      theme: "grid",
      headStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: "bold" },
      columnStyles: {
        2: { halign: "right" }, // Quantity column
      },
    });

    // No summary calculations for Packing Slip
    // const finalY = (doc as any).lastAutoTable.finalY + 10;
    // ... (removed summary calculations and display)

    // Save PDF
    doc.save(`Packing_Slip_${orderNumber}.pdf`);

    // No toast here, let the calling function handle it.
  } catch (error) {
    console.error("Packing Slip PDF Error:", error);
    throw error; // Re-throw the error so handleDownloadPackingSlip can catch it
  }
};