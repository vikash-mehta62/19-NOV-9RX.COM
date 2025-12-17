import { OrderPDFConfig } from '@/types/orderStatement';

/**
 * PDF Configuration for Order Statements (Landscape Format)
 * Requirements: 2.1, 2.2, 2.4, 6.1, 6.2, 6.3, 6.4
 */
export const ORDER_PDF_CONFIG: OrderPDFConfig = {
  orientation: 'landscape',
  unit: 'mm',
  format: 'a4',
  margins: {
    top: 15,
    right: 10,
    bottom: 15,
    left: 10,
  },
  header: {
    logoPath: '/final.png',
    companyName: '9RX Pharmacy Solutions',
    businessAddress: 'Business Address Line 1, City, State, ZIP',
    contactInfo: 'Phone: (555) 123-4567 | Email: info@9rx.com',
  },
  table: {
    startY: 60,
    columnWidths: [35, 25, 25, 30, 30, 25, 25], // Order#, Date, Status, Payment Status, Amount, Paid, Pending
    headers: ['Order #', 'Date', 'Status', 'Payment Status', 'Amount', 'Paid', 'Pending'],
  },
};

/**
 * Currency formatting configuration
 * Requirements: 2.3
 */
export const CURRENCY_CONFIG = {
  locale: 'en-US',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/**
 * Format currency amount consistently
 * Requirements: 2.3
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat(CURRENCY_CONFIG.locale, {
    style: 'currency',
    currency: CURRENCY_CONFIG.currency,
    minimumFractionDigits: CURRENCY_CONFIG.minimumFractionDigits,
    maximumFractionDigits: CURRENCY_CONFIG.maximumFractionDigits,
  }).format(amount);
};

/**
 * PDF page dimensions for landscape A4
 */
export const PDF_DIMENSIONS = {
  width: 297, // A4 landscape width in mm
  height: 210, // A4 landscape height in mm
  usableWidth: 277, // Width minus margins (297 - 10 - 10)
  usableHeight: 180, // Height minus margins (210 - 15 - 15)
};

/**
 * Color scheme for professional PDF appearance
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */
export const PDF_COLORS = {
  primary: '#1f2937', // Dark gray for headers
  secondary: '#6b7280', // Medium gray for text
  accent: '#3b82f6', // Blue for highlights
  background: '#f9fafb', // Light gray for alternating rows
  border: '#e5e7eb', // Light gray for borders
  white: '#ffffff',
  success: '#10b981', // Green for paid status
  warning: '#f59e0b', // Orange for pending status
  error: '#ef4444', // Red for failed status
};

/**
 * Font configuration for PDF
 */
export const PDF_FONTS = {
  title: {
    size: 18,
    weight: 'bold',
  },
  header: {
    size: 14,
    weight: 'bold',
  },
  subheader: {
    size: 12,
    weight: 'bold',
  },
  body: {
    size: 10,
    weight: 'normal',
  },
  small: {
    size: 8,
    weight: 'normal',
  },
};

/**
 * Table styling configuration
 * Requirements: 2.4, 6.3, 6.4
 */
export const TABLE_STYLES = {
  headerBackground: PDF_COLORS.primary,
  headerTextColor: PDF_COLORS.white,
  alternateRowBackground: PDF_COLORS.background,
  borderColor: PDF_COLORS.border,
  textColor: PDF_COLORS.secondary,
  fontSize: PDF_FONTS.body.size,
  headerFontSize: PDF_FONTS.subheader.size,
  cellPadding: 3,
  lineWidth: 0.5,
};