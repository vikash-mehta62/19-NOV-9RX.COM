import { lazy } from 'react';

// Lazy load PDF-related components to reduce initial bundle size
export const LazyPDFGenerator = lazy(() => 
  import('../pdf/PDFGenerator').then(module => ({ default: module.PDFGenerator }))
);

export const LazyInvoicePDF = lazy(() => 
  import('../pdf/InvoicePDF').then(module => ({ default: module.InvoicePDF }))
);

export const LazyReportPDF = lazy(() => 
  import('../pdf/ReportPDF').then(module => ({ default: module.ReportPDF }))
);

// PDF utilities that should only be loaded when needed
export const loadPDFLibraries = async () => {
  const [jsPDF, autoTable, pdfLib] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('pdf-lib')
  ]);
  
  return {
    jsPDF: jsPDF.default,
    autoTable: autoTable.default,
    pdfLib
  };
};