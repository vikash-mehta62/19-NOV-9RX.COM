// formate 2
{
const handleDownloadPDF = async () => {
  setIsGeneratingPDF(true);

  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    // Logo
    const logo = new Image();
    logo.src = "/final.png";
    await new Promise((resolve) => (logo.onload = resolve));
    const logoHeight = 25;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    doc.addImage(logo, "PNG", pageWidth / 2 - logoWidth / 2, margin, logoWidth, logoHeight);

    // Titles
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("PURCHASE ORDER", pageWidth - margin - 45, margin + 10);

    doc.setFontSize(10);
    const formattedDate = new Date(currentOrder.date).toLocaleDateString("en-US");
    doc.text(`ORDER - ${currentOrder.order_number}`, pageWidth - margin - 45, margin + 20);
    doc.text(`Date - ${formattedDate}`, pageWidth - margin - 45, margin + 25);

    // Company Info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Tax ID : 99-0540972", margin, margin + 5);
    doc.text("936 Broad River Ln,", margin, margin + 10);
    doc.text("Charlotte, NC 28211", margin, margin + 15);
    doc.text("+1 800 969 6295", margin, margin + 20);
    doc.text("info@9rx.com", margin, margin + 25);
    doc.text("www.9rx.com", margin, margin + 30);

    doc.setDrawColor(200);
    doc.line(margin, margin + 40, pageWidth - margin, margin + 40);

    // Addresses
    const infoStartY = margin + 50;
    doc.setFont("helvetica", "bold").setFontSize(11).text("Bill To", margin, infoStartY);
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("9RX", margin, infoStartY + 5);
    doc.text(currentOrder.customerInfo?.name || "N/A", margin, infoStartY + 10);
    doc.text(currentOrder.customerInfo?.phone || "N/A", margin, infoStartY + 15);
    doc.text(currentOrder.customerInfo?.email || "N/A", margin, infoStartY + 20);
    doc.text(
      `${currentOrder.customerInfo?.address?.street || ""} ${currentOrder.customerInfo?.address?.city || ""}, ${currentOrder.customerInfo?.address?.state || ""} ${currentOrder.customerInfo?.address?.zip_code || ""}`,
      margin,
      infoStartY + 25,
      { maxWidth: contentWidth / 2 }
    );

    doc.setFont("helvetica", "bold").setFontSize(11).text("Ship To", pageWidth / 2, infoStartY);
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("9RX", pageWidth / 2, infoStartY + 5);
    doc.text(currentOrder.shippingAddress?.fullName || "N/A", pageWidth / 2, infoStartY + 10);
    doc.text(currentOrder.shippingAddress?.phone || "N/A", pageWidth / 2, infoStartY + 15);
    doc.text(currentOrder.shippingAddress?.email || "N/A", pageWidth / 2, infoStartY + 20);
    doc.text(
      `${currentOrder.shippingAddress?.address?.street || ""} ${currentOrder.shippingAddress?.address?.city || ""}, ${currentOrder.shippingAddress?.address?.state || ""} ${currentOrder.shippingAddress?.address?.zip_code || ""}`,
      pageWidth / 2,
      infoStartY + 25,
      { maxWidth: contentWidth / 2 }
    );

    doc.line(margin, infoStartY + 35, pageWidth - margin, infoStartY + 35);

    // Items Table
    const tableStartY = infoStartY + 45;
    const tableHead = [["Description", "Size", "Qty", "Price/Unit", "Total"]];

 const tableBody = [];

currentOrder.items.forEach((item) => {
  // Add a separate row for the product name (spanning all columns)
  tableBody.push([
    { content: item.name, colSpan: 5, styles: { fontStyle: 'bold', halign: 'left', fillColor: [245, 245, 245] } }
  ]);

  item.sizes.forEach((size) => {
    const sizeValueUnit = `${size.size_value} ${size.size_unit}`;
    const quantity = size.quantity.toString();
    const pricePerUnit = `$${Number(size.price).toFixed(2)}`;
    const totalPerSize = `$${(size.quantity * size.price).toFixed(2)}`;

    tableBody.push([
      "", // Description column empty (since we show name in separate row)
      sizeValueUnit,
      quantity,
      pricePerUnit,
      totalPerSize,
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
    2: { halign: "right" },
    3: { halign: "right" },
    4: { halign: "right" },
  },
});


    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Summary Calculations
    const subtotal = currentOrder.items.reduce((sum, item) => {
      return sum + item.sizes.reduce((sizeSum, size) => sizeSum + (size.quantity * size.price), 0);
    }, 0);
    const handling = Number(currentOrder?.po_handling_charges || 0);
    const fred = Number(currentOrder?.po_fred_charges || 0);
    const shipping = Number(currentOrder?.shipping_cost || 0);
    const tax = Number(currentOrder?.tax_amount || 0);
    const total = subtotal + handling + fred + shipping + tax;

    const summaryX = pageWidth - margin; // Align summary to the right
    let summaryY = finalY;

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Order Summary", summaryX, summaryY, { align: "right" });
    summaryY += 6;

    const summaryRows = [
      ["Sub Total", subtotal],
      ["Handling Charges", handling],
      ["Fred Charges", fred],
      ["Shipping", shipping],
      ["Tax", tax],
      ["Total", total],
    ];

    doc.setFont("helvetica", "normal").setFontSize(9);
    summaryRows.forEach(([label, value]) => {
      doc.text(label, summaryX - 40, summaryY, { align: "right" }); // Adjust position for label
      doc.text(`$${value.toFixed(2)}`, summaryX, summaryY, { align: "right" });
      summaryY += 5;
    });

    // Save PDF
    doc.save(`Invoice_${currentOrder.order_number}.pdf`);

    toast({
      title: "Success",
      description: "Invoice downloaded successfully",
    });
  } catch (error) {
    console.error("PDF Error:", error);
    toast({
      title: "Error",
      description: "Failed to generate PDF.",
      variant: "destructive",
    });
  } finally {
    setIsGeneratingPDF(false);
  }
};
}



// 1
{
  
  const handleDownloadPDF = async () => {
  setIsGeneratingPDF(true);

  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    const contentWidth = pageWidth - margin * 2;

    // Logo
    const logo = new Image();
    logo.src = "/final.png";
    await new Promise((resolve) => (logo.onload = resolve));
    const logoHeight = 25;
    const logoWidth = (logo.width / logo.height) * logoHeight;
    doc.addImage(logo, "PNG", pageWidth / 2 - logoWidth / 2, margin, logoWidth, logoHeight);

    // Titles
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("PURCHASE ORDER", pageWidth - margin - 45, margin + 10);

    doc.setFontSize(10);
    const formattedDate = new Date(currentOrder.date).toLocaleDateString("en-US");
    doc.text(`ORDER - ${currentOrder.order_number}`, pageWidth - margin - 45, margin + 20);
    doc.text(`Date - ${formattedDate}`, pageWidth - margin - 45, margin + 25);

    // Company Info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Tax ID : 99-0540972", margin, margin + 5);
    doc.text("936 Broad River Ln,", margin, margin + 10);
    doc.text("Charlotte, NC 28211", margin, margin + 15);
    doc.text("+1 800 969 6295", margin, margin + 20);
    doc.text("info@9rx.com", margin, margin + 25);
    doc.text("www.9rx.com", margin, margin + 30);

    doc.setDrawColor(200);
    doc.line(margin, margin + 40, pageWidth - margin, margin + 40);

    // Addresses
    const infoStartY = margin + 50;
    doc.setFont("helvetica", "bold").setFontSize(11).text("Vendor", margin, infoStartY);
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("9RX", margin, infoStartY + 5);
    doc.text(currentOrder.customerInfo?.name || "N/A", margin, infoStartY + 10);
    doc.text(currentOrder.customerInfo?.phone || "N/A", margin, infoStartY + 15);
    doc.text(currentOrder.customerInfo?.email || "N/A", margin, infoStartY + 20);
    doc.text(
      `${currentOrder.customerInfo?.address?.street || ""} ${currentOrder.customerInfo?.address?.city || ""}, ${currentOrder.customerInfo?.address?.state || ""} ${currentOrder.customerInfo?.address?.zip_code || ""}`,
      margin,
      infoStartY + 25,
      { maxWidth: contentWidth / 2 }
    );

    doc.setFont("helvetica", "bold").setFontSize(11).text("Ship To", pageWidth / 2, infoStartY);
    doc.setFont("helvetica", "normal").setFontSize(9);
    doc.text("9RX", pageWidth / 2, infoStartY + 5);
    doc.text(currentOrder.shippingAddress?.fullName || "N/A", pageWidth / 2, infoStartY + 10);
    doc.text(currentOrder.shippingAddress?.phone || "N/A", pageWidth / 2, infoStartY + 15);
    doc.text(currentOrder.shippingAddress?.email || "N/A", pageWidth / 2, infoStartY + 20);
    doc.text(
      `${currentOrder.shippingAddress?.address?.street || ""} ${currentOrder.shippingAddress?.address?.city || ""}, ${currentOrder.shippingAddress?.address?.state || ""} ${currentOrder.shippingAddress?.address?.zip_code || ""}`,
      pageWidth / 2,
      infoStartY + 25,
      { maxWidth: contentWidth / 2 }
    );

    doc.line(margin, infoStartY + 35, pageWidth - margin, infoStartY + 35);

    // Items Table
    const tableStartY = infoStartY + 45;
    const tableHead = [["Description", "Size", "Qty", "Price/Unit", "Total"]];

    const tableBody = [];
    currentOrder.items.forEach((item) => {
      item.sizes.forEach((size, index) => {
        const description = index === 0 ? item.name : ""; // Show product name only for the first size entry
        const sizeValueUnit = `${size.size_value} ${size.size_unit}`;
        const quantity = size.quantity.toString();
        const pricePerUnit = `$${Number(size.price).toFixed(2)}`;
        const totalPerSize = `$${(size.quantity * size.price).toFixed(2)}`;
        tableBody.push([description, sizeValueUnit, quantity, pricePerUnit, totalPerSize]);
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
        3: { halign: "right" }, // Price/Unit column
        4: { halign: "right" }, // Total column
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Summary Calculations
    const subtotal = currentOrder.items.reduce((sum, item) => {
      return sum + item.sizes.reduce((sizeSum, size) => sizeSum + (size.quantity * size.price), 0);
    }, 0);
    const handling = Number(currentOrder?.po_handling_charges || 0);
    const fred = Number(currentOrder?.po_fred_charges || 0);
    const shipping = Number(currentOrder?.shipping_cost || 0);
    const tax = Number(currentOrder?.tax_amount || 0);
    const total = subtotal + handling + fred + shipping + tax;

    const summaryX = pageWidth - margin; // Align summary to the right
    let summaryY = finalY;

    doc.setFont("helvetica", "bold").setFontSize(10);
    doc.text("Order Summary", summaryX, summaryY, { align: "right" });
    summaryY += 6;

    const summaryRows = [
      ["Sub Total", subtotal],
      ["Handling Charges", handling],
      ["Fred Charges", fred],
      ["Shipping", shipping],
      ["Tax", tax],
      ["Total", total],
    ];

    doc.setFont("helvetica", "normal").setFontSize(9);
    summaryRows.forEach(([label, value]) => {
      doc.text(label, summaryX - 40, summaryY, { align: "right" }); // Adjust position for label
      doc.text(`$${value.toFixed(2)}`, summaryX, summaryY, { align: "right" });
      summaryY += 5;
    });

    // Save PDF
    doc.save(`Invoice_${currentOrder.order_number}.pdf`);

    toast({
      title: "Success",
      description: "Invoice downloaded successfully",
    });
  } catch (error) {
    console.error("PDF Error:", error);
    toast({
      title: "Error",
      description: "Failed to generate PDF.",
      variant: "destructive",
    });
  } finally {
    setIsGeneratingPDF(false);
  }
};

}


// 3
{
  
  
  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;









      // Add Logo (Left side)
      const logo = new Image();
      logo.src = "/final.png";
      await new Promise((resolve) => (logo.onload = resolve));
      const logoHeight = 25;
      const logoWidth = (logo.width / logo.height) * logoHeight;
      doc.addImage(logo, "PNG", margin, margin, logoWidth, logoHeight);

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
      doc.setFontSize(10);
      doc.text("+1 800 969 6295", pageWidth / 2, margin + logoHeight / 2 + 5, { align: "center" });

      // PURCHASE ORDER TITLE (right side)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("PURCHASE ORDER", pageWidth - margin - 10, margin + 10, { align: "right" });

      doc.setFontSize(10);
      doc.text(`ORDER - ${currentOrder.order_number}`, pageWidth - margin - 10, margin + 15, { align: "right" });
      doc.text(`Date - ${formattedDate}`, pageWidth - margin - 10, margin + 20, { align: "right" });

      // Divider line
      doc.setDrawColor(200);
      doc.line(margin, margin + 26, pageWidth - margin, margin + 26);

      // Addresses
      const infoStartY = margin + 35;
      doc.setFont("helvetica", "bold").setFontSize(11).text("Vendor", margin, infoStartY);
      doc.setFont("helvetica", "normal").setFontSize(9);
      doc.text("9RX", margin, infoStartY + 5);
      doc.text(currentOrder.customerInfo?.name || "N/A", margin, infoStartY + 10);
      doc.text(currentOrder.customerInfo?.phone || "N/A", margin, infoStartY + 15);
      doc.text(currentOrder.customerInfo?.email || "N/A", margin, infoStartY + 20);
      doc.text(
        `${currentOrder.customerInfo?.address?.street || ""} ${currentOrder.customerInfo?.address?.city || ""}, ${currentOrder.customerInfo?.address?.state || ""} ${currentOrder.customerInfo?.address?.zip_code || ""}`,
        margin,
        infoStartY + 25,
        { maxWidth: contentWidth / 2 }
      );














      doc.setFont("helvetica", "bold").setFontSize(11).text("Ship To", pageWidth / 2, infoStartY);
      doc.setFont("helvetica", "normal").setFontSize(9);
      doc.text("9RX", pageWidth / 2, infoStartY + 5);
      doc.text(currentOrder.shippingAddress?.fullName || "N/A", pageWidth / 2, infoStartY + 10);
      doc.text(currentOrder.shippingAddress?.phone || "N/A", pageWidth / 2, infoStartY + 15);
      doc.text(currentOrder.shippingAddress?.email || "N/A", pageWidth / 2, infoStartY + 20);
      doc.text(
        `${currentOrder.shippingAddress?.address?.street || ""} ${currentOrder.shippingAddress?.address?.city || ""}, ${currentOrder.shippingAddress?.address?.state || ""} ${currentOrder.shippingAddress?.address?.zip_code || ""}`,
        pageWidth / 2,
        infoStartY + 25,
        { maxWidth: contentWidth / 2 }
      );

      doc.line(margin, infoStartY + 35, pageWidth - margin, infoStartY + 35);

      // Items Table
      const tableStartY = infoStartY + 45;
      const tableHead = [["Description", "Size", "Qty", "Price/Unit", "Total"]];

      const tableBody = [];

      currentOrder.items.forEach((item) => {
        item.sizes.forEach((size) => {
          const description = item.name; // Show product name in every row
          const sizeValueUnit = `${size.size_value} ${size.size_unit}`;
          const quantity = size.quantity.toString();
          const pricePerUnit = `$${Number(size.price).toFixed(2)}`;
          const totalPerSize = `$${(size.quantity * size.price).toFixed(2)}`;

          tableBody.push([
            description,
            sizeValueUnit,
            quantity,
            pricePerUnit,
            totalPerSize,
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
          3: { halign: "right" }, // Price/Unit column
          4: { halign: "right" }, // Total column
        },
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;

      // Summary Calculations
      const subtotal = currentOrder.items.reduce((sum, item) => {
        return sum + item.sizes.reduce((sizeSum, size) => sizeSum + (size.quantity * size.price), 0);
      }, 0);
      const handling = Number(currentOrder?.po_handling_charges || 0);
      const fred = Number(currentOrder?.po_fred_charges || 0);
      const shipping = Number(currentOrder?.shipping_cost || 0);
      const tax = Number(currentOrder?.tax_amount || 0);
      const total = subtotal + handling + fred + shipping + tax;

      const summaryX = pageWidth - margin; // Align summary to the right
      let summaryY = finalY;

      doc.setFont("helvetica", "bold").setFontSize(10);
      doc.text("Order Summary", summaryX, summaryY, { align: "right" });
      summaryY += 6;

      const summaryRows = [
        ["Sub Total", subtotal],
        ["Handling Charges", handling],
        ["Freight Charges", fred],
        ["Shipping", shipping],
        ["Tax", tax],
        ["Total", total],
      ];

      doc.setFont("helvetica", "normal").setFontSize(9);
      summaryRows.forEach(([label, value]) => {
        doc.text(label, summaryX - 40, summaryY, { align: "right" }); // Adjust position for label
        doc.text(`$${value.toFixed(2)}`, summaryX, summaryY, { align: "right" });
        summaryY += 5;
      });

      // Save PDF
      doc.save(`Invoice_${currentOrder.order_number}.pdf`);

      toast({
        title: "Success",
        description: "Invoice downloaded successfully",
      });
    } catch (error) {
      console.error("PDF Error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

}