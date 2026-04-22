// This is the replacement code for the totals section in frontendStylePdfGenerator.js
// Replace lines 805-861 with this code

      totalY += 4;
      
      // Total box (bold text with border, no background)
      ensureSummarySpace(finalBlockHeight);
      const totalBoxY = totalY + 2;
      doc.roundedRect(mm(totalBoxX), mm(totalBoxY), mm(totalBoxWidth), mm(totalBoxHeight), mm(1))
        .strokeColor(BRAND_BLUE)
        .lineWidth(1.5)
        .stroke();
      
      doc.fontSize(11)
         .fillColor(BRAND_BLUE)
         .font('Helvetica-Bold')
        .text('TOTAL', mm(totalBoxX + 10), mm(totalBoxY + 3.5));
      doc.fillColor(BRAND_BLUE)
        .font('Helvetica-Bold')
        .text(`$${formatCurrency(total)}`, mm(totalBoxX + totalBoxWidth - 35), mm(totalBoxY + 3.5), { width: mm(30), align: 'right' });
      
      // Add "PAID AMOUNT" and "BALANCE DUE" badges if paid (bold text with border, no background)
      if (actualPaid > 0) {
          totalY = totalBoxY + totalBoxHeight + SUMMARY_BOX_GAP;
        doc.roundedRect(mm(totalBoxX), mm(totalY), mm(totalBoxWidth), mm(totalBoxHeight), mm(1))
            .strokeColor(SUCCESS_GREEN)
            .lineWidth(1.5)
           .stroke();
        
        doc.fontSize(11)
           .fillColor(SUCCESS_GREEN)
           .font('Helvetica-Bold')
            .text(isInvoice ? 'PAID AMOUNT' : 'PAID', mm(totalBoxX + 10), mm(totalY + 3.5));
          doc.fillColor(SUCCESS_GREEN)
            .font('Helvetica-Bold')
            .text(`$${formatCurrency(actualPaid)}`, mm(totalBoxX + totalBoxWidth - 35), mm(totalY + 3.5), { width: mm(30), align: 'right' });
        
          if (balanceDue > 0 && !isPurchaseOrder) {
           totalY += totalBoxHeight + SUMMARY_BOX_GAP;
           doc.roundedRect(mm(totalBoxX), mm(totalY), mm(totalBoxWidth), mm(totalBoxHeight), mm(1))
             .strokeColor(ALERT_RED)
             .lineWidth(1.5)
             .stroke();

           doc.fontSize(11)
             .fillColor(ALERT_RED)
             .font('Helvetica-Bold')
             .text('BALANCE DUE', mm(totalBoxX + 10), mm(totalY + 3.5));
           doc.fillColor(ALERT_RED)
              .font('Helvetica-Bold')
              .text(`$${formatCurrency(balanceDue)}`, mm(totalBoxX + totalBoxWidth - 35), mm(totalY + 3.5), { width: mm(30), align: 'right' });
          } else if (balanceDue === 0) {
          totalY += totalBoxHeight + SUMMARY_BOX_GAP;
          doc.roundedRect(mm(totalBoxX), mm(totalY), mm(totalBoxWidth), mm(totalBoxHeight), mm(1))
             .strokeColor(SUCCESS_GREEN)
             .lineWidth(1.5)
             .stroke();
          
          doc.fontSize(12)
             .fillColor(SUCCESS_GREEN)
             .font('Helvetica-Bold')
             .text('FULLY PAID', mm(totalBoxX), mm(totalY + 3.5), { width: mm(totalBoxWidth), align: 'center' });
        }
      }
      contentBottomY = Math.max(contentBottomY, totalY + totalBoxHeight);
