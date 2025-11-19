import jsPDF from "jspdf";
import JsBarcode from "jsbarcode"; // Keeping JsBarcode import as it was present in your previous full code

interface WorkOrderData {
  id: string;
  invoice_number: string;
  order_id: string;
  status: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  due_date: string;
  created_at: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number; // This is the overall item quantity, not per size
    sizes: Array<{
      id: string;
      sku: string;
      size_value: string;
      size_unit: string;
      quantity: number; // This is the quantity per specific size (Shipped QTY)
      price: number;
      quantity_per_case: number; // This is QTY/CS
    }>;
  }>;
  customer_info: {
    name: string;
    type: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip_code: string;
    };
  };
  shipping_info: {
    fullName: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip_code: string;
    };
  };
  orders: {
    order_number: string;
  };
  profiles: {
    first_name: string;
    last_name: string;
    company_name: string;
    email: string;
  };
}

interface PackingSlipData {
  shipVia: string;
  notes: string;
  cartons: string;
  masterCases: string;
  weight: string;
  shippingClass: string;
}

// Generate barcode as base64 image
const generateBarcode = (text: string): string => {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, text, {
    format: "CODE128",
    width: 1.5,
    height: 25,
    displayValue: true,
    fontSize: 8,
    textMargin: 2,
  });
  return canvas.toDataURL("image/png");
};

export const generateWorkOrderPDF = async (
  workOrderData: WorkOrderData,
  packingData: PackingSlipData
) => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    // Add Logo (Left side)
    const logo = new Image();
    logo.src = "/final.png";
    await new Promise((resolve) => (logo.onload = resolve));
    const logoHeight = 23;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    // Logo (center aligned)
    doc.addImage(
      logo,
      "PNG",
      pageWidth / 2 - logoWidth / 2,
      margin,
      logoWidth,
      logoHeight
    );

    // Set Fonts
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    // Top Info Line (All in one row, top line)
    const topInfo = [
      "Tax ID : 99-0540972",
      "936 Broad River Ln, Charlotte, NC 28211",
      "info@9rx.com",
      "www.9rx.com",
    ].join("     |     ");
    doc.text(topInfo, pageWidth / 2, margin - 2, { align: "center" });

    // Centered Phone Number (under logo)
    // Phone number (left aligned, vertically center of logo)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("+1 800 969 6295", margin, margin + 10);

    // PACKING SLIP TITLE (right side)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("PACKING SLIP", pageWidth - margin, margin + 10, {
      align: "right",
    });

    const orderNumber =
      workOrderData?.orders?.order_number || workOrderData?.order_id || "N/A";
    const formattedDate = new Date(
      workOrderData?.created_at || new Date()
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    doc.setFontSize(10);
    doc.text(
      `ORDER - ${
        workOrderData?.orders?.order_number || workOrderData?.order_id
      }`,
      pageWidth - margin,
      margin + 15,
      { align: "right" }
    );
    doc.text(`Date - ${formattedDate}`, pageWidth - margin, margin + 20, {
      align: "right",
    });

    // Divider line - Same as PO
    doc.setDrawColor(200);
    doc.line(margin, margin + 26, pageWidth - margin, margin + 26);

    // Addresses - "Bill To" and "Ship To" side-by-side, like PO
    const infoStartY = margin + 35;

    // Bill To Section - Populated from workOrderData.customer_info and profiles
    doc
      .setFont("helvetica", "bold")
      .setFontSize(11)
      .text("Bill To", margin, infoStartY);
    doc.setFont("helvetica", "normal").setFontSize(9);
    // Bill To Section
    let billToY = infoStartY;
    const billToX = margin;

    const addBillToLine = (text) => {
      if (text && text.trim()) {
        billToY += 5; // sirf jab print hota hai tab hi Y increment
        doc.text(text, billToX, billToY);
      }
    };

    addBillToLine(workOrderData?.profiles?.company_name);
    addBillToLine(workOrderData?.customer_info?.name);
    addBillToLine(workOrderData?.customer_info?.phone);
    addBillToLine(workOrderData?.customer_info?.email);

    if (
      workOrderData?.customer_info?.address?.street ||
      workOrderData?.customer_info?.address?.city ||
      workOrderData?.customer_info?.address?.state ||
      workOrderData?.customer_info?.address?.zip_code
    ) {
      const address = `${workOrderData?.customer_info?.address?.street || ""} ${
        workOrderData?.customer_info?.address?.city || ""
      }, ${workOrderData?.customer_info?.address?.state || ""} ${
        workOrderData?.customer_info?.address?.zip_code || ""
      }`.trim();
      addBillToLine(address);
    }

    // Ship To Section
    let shipToY = infoStartY;
    const shipToX = pageWidth / 2;

    doc
      .setFont("helvetica", "bold")
      .setFontSize(11)
      .text("Ship To", shipToX, shipToY);
    doc.setFont("helvetica", "normal").setFontSize(9);

    const addShipToLine = (text) => {
      if (text && text.trim()) {
        shipToY += 5;
        doc.text(text, shipToX, shipToY);
      }
    };

    addShipToLine(workOrderData?.profiles?.company_name);
    addShipToLine(workOrderData?.shipping_info?.fullName);
    addShipToLine(workOrderData?.shipping_info?.phone);
    addShipToLine(workOrderData?.shipping_info?.email);

    if (
      workOrderData?.shipping_info?.address?.street ||
      workOrderData?.shipping_info?.address?.city ||
      workOrderData?.shipping_info?.address?.state ||
      workOrderData?.shipping_info?.address?.zip_code
    ) {
      const shipAddress = `${
        workOrderData?.shipping_info?.address?.street || ""
      } ${workOrderData?.shipping_info?.address?.city || ""}, ${
        workOrderData?.shipping_info?.address?.state || ""
      } ${workOrderData?.shipping_info?.address?.zip_code || ""}`.trim();
      addShipToLine(shipAddress);
    }

    doc.line(margin, infoStartY + 35, pageWidth - margin, infoStartY + 35);

    // Items Table - Now with specific headers: ITEMS, DESCRIPTION, QTY/CS, Shipped QTY, IN CASE
    const tableStartY = infoStartY + 45;
  // Table head (will add Q. PER ROLL if needed)
const tableHead = [
  [
    "ITEMS",
    "DESCRIPTION",
    "QTY/CS",
    "Shipped QTY (IN CASE)"
  ]
];

const tableBody = [];

if (workOrderData?.items && Array.isArray(workOrderData.items)) {
  let hasRollsPerCase = false; // Track if we need to add Q. PER ROLL column

  workOrderData.items.forEach((item) => {
    if (Array.isArray(item.sizes)) {
      item.sizes.forEach((size) => {
        const itemSku = size.sku || "N/A";
        const description = `${item.name || "N/A"} - ${size.size_value || ""} ${size.size_unit || ""}`;

        let quantityPerCase = "N/A";
        let quantityPerRoll = null;

        if (size.size_unit === "ROLL") {
          // Rolls case
          quantityPerCase = size.rolls_per_case.toString();
          quantityPerRoll = size.quantity_per_case ?? "N/A";
          hasRollsPerCase = true;
        } else {
          // Normal case
          quantityPerCase = size.quantity_per_case?.toString() ?? "N/A";
        }

        const shippedQuantity = size.quantity?.toString() ?? "N/A";

        // Build row
        const row = [itemSku, description, quantityPerCase];
        if (quantityPerRoll !== null) {
          row.push(quantityPerRoll.toString());
        }
        row.push(shippedQuantity);

        tableBody.push(row);
      });
    }
  });

  // If any size had rolls_per_case > 1, add Q. PER ROLL in header
  if (hasRollsPerCase) {
    tableHead[0] = [
      "ITEMS",
      "DESCRIPTION",
      "QTY/CS",
      "Q. PER ROLL",
      "Shipped QTY (IN CASE)"
    ];
  }

} else {
  console.warn("No valid items found for packing slip.");
  tableBody.push(["No items found for this packing slip.", "", "", "", ""]);
}


    (doc as any).autoTable({
      head: tableHead,
      body: tableBody,
      startY: tableStartY,
      styles: { fontSize: 9 },
      theme: "grid",
      headStyles: {
        fillColor: [230, 230, 230],
        textColor: 0,
        fontStyle: "bold",
      },
      columnStyles: {
        // Adjust column indices for the new headers:
        // ITEMS (0), DESCRIPTION (1), QTY/CS (2), Shipped QTY (3), IN CASE (4)
        2: { halign: "right" }, // QTY/CS
        3: { halign: "right" }, // Shipped QTY
        4: { halign: "center" }, // IN CASE
      },
      margin: { left: margin, right: margin }, // full width
      tableWidth: "auto", // stretch to margins
      didDrawPage: function (data: any) {
        // This function will be triggered for each page drawn by autoTable.
        // It's useful for repeating headers/footers on multi-page tables if autoTable's
        // default header repetition isn't sufficient.
      },
    });

    // Get the final Y position after the autoTable.
    let currentYPosition = (doc as any).lastAutoTable.finalY + 10;

    // Helper function to add sections safely, handling page breaks
    const addSectionSafely = (
      textFunction: () => void,
      requiredHeight: number
    ) => {
      if (currentYPosition + requiredHeight > pageHeight - margin) {
        // Check if new page is needed
        doc.addPage();
        currentYPosition = margin + 10; // Reset Y for new page, with some top margin
      }
      textFunction();
    };

    // --- Add packingData specific sections here ---

    // Ship Via Section
    addSectionSafely(() => {
      doc.setFont("helvetica", "bold").setFontSize(9);
      doc.text(`Ship Via:`, margin, currentYPosition);
      doc.setFont("helvetica", "normal").setFontSize(9);
      doc.text(packingData.shipVia || "N/A", margin + 20, currentYPosition); // Adjust X for value
      currentYPosition += 8;
    }, 10);

    // Notes Section
    if (packingData.notes) {
      addSectionSafely(() => {
        doc.setFont("helvetica", "bold").setFontSize(9);
        doc.text("NOTES:", margin, currentYPosition);
        currentYPosition += 6;

        doc.setFont("helvetica", "normal").setFontSize(8);
        const notesLines = doc.splitTextToSize(packingData.notes, contentWidth);
        doc.text(notesLines, margin, currentYPosition);
        currentYPosition += notesLines.length * 4;
        currentYPosition += 10;
      }, (packingData.notes.length / 50) * 4 + 20);
    }

    // Bottom section (Cartons, Master cases, Weight, Shipping class)
    addSectionSafely(() => {
      doc.setFont("helvetica", "normal").setFontSize(9);
      doc.text(
        `Cartons: ${packingData.cartons || "N/A"}`,
        margin,
        currentYPosition
      );
      doc.text(
        `Master cases: ${packingData.masterCases || "N/A"}`,
        pageWidth / 2,
        currentYPosition
      );
      currentYPosition += 8;
      doc.text(
        `Weight: ${packingData.weight || "N/A"}`,
        margin,
        currentYPosition
      );
      doc.text(
        `Shipping class: ${packingData.shippingClass || "N/A"}`,
        pageWidth / 2,
        currentYPosition
      );
      currentYPosition += 20;
    }, 30);

    // Signature section
    addSectionSafely(() => {
      doc.text(
        "Signature: _________________________________",
        margin,
        currentYPosition
      );
      doc.text("Date: _______________", pageWidth / 2, currentYPosition);
      currentYPosition += 10;
    }, 15);

    // Save the PDF
    doc.save(`Packing_Slip_${orderNumber}.pdf`);
  } catch (error) {
    console.error("Packing Slip PDF Error:", error);
    throw error;
  }
};
