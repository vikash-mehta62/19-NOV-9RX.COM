// Order Statement Type Definitions
// Based on design document interfaces and requirements 1.1, 2.1, 3.1

/**
 * Order Statement Record Interface
 * Represents individual order data for statement generation
 */
export interface OrderStatementRecord {
  orderNumber: string;
  orderDate: string;
  orderStatus: 'pending' | 'processing' | 'completed' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'partial' | 'failed';
  orderAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

/**
 * Order Statement Summary Interface
 * Contains aggregated data for the statement period
 */
export interface OrderStatementSummary {
  totalOrders: number;
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * User Profile Information for PDF Header
 */
export interface UserProfileInfo {
  id: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  email?: string;
  billing_address?: any;
  shipping_address?: any;
}

/**
 * Company Information for PDF Header
 */
export interface CompanyInfo {
  name: string;
  address: string;
  contactInfo: string;
  logoPath: string;
}

/**
 * Complete Order Statement Data
 * Contains all information needed for PDF generation
 */
export interface OrderStatementData {
  userId: string;
  startDate: Date;
  endDate?: Date;
  orders: OrderStatementRecord[];
  summary: OrderStatementSummary;
  userInfo: UserProfileInfo;
  companyInfo: CompanyInfo;
}

/**
 * Order Statement Request Interface
 */
export interface OrderStatementRequest {
  userId: string;
  startDate: Date;
  endDate?: Date;
  includeZeroActivity: boolean;
}

/**
 * Order Statement Response Interface
 */
export interface OrderStatementResponse {
  success: boolean;
  data?: OrderStatementData;
  error?: string;
  filename?: string;
}

/**
 * PDF Configuration for Order Statements (Landscape Format)
 */
export interface OrderPDFConfig {
  orientation: 'landscape';
  unit: 'mm';
  format: 'a4';
  margins: {
    top: 15;
    right: 10;
    bottom: 15;
    left: 10;
  };
  header: {
    logoPath: '/final.png';
    companyName: string;
    businessAddress: string;
    contactInfo: string;
  };
  table: {
    startY: 60;
    columnWidths: [35, 25, 25, 30, 30, 25, 25];
    headers: ['Order #', 'Date', 'Status', 'Payment Status', 'Amount', 'Paid', 'Pending'];
  };
}

/**
 * Order Statement Service Interface
 * Defines the contract for order statement generation
 */
export interface OrderStatementService {
  generateOrderStatement(userId: string, startDate: Date, endDate?: Date): Promise<void>;
  fetchOrderData(userId: string, startDate: Date, endDate?: Date): Promise<OrderStatementData>;
  createOrderPDF(statementData: OrderStatementData): Promise<Blob>;
}

/**
 * Date Selector Component Props
 */
export interface OrderStatementDateSelectorProps {
  onDateRangeChange: (startDate: Date, endDate?: Date) => void;
  onDownload: (startDate: Date, endDate?: Date) => void;
  isGenerating: boolean;
  maxDateRange?: number; // days
  className?: string;
}