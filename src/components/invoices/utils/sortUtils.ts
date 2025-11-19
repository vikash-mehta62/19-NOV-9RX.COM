import { Invoice } from "../types/invoice.types";
import { SortConfig } from "../types/table.types";

export const sortInvoices = (invoices: Invoice[], sortConfig: SortConfig | null): Invoice[] => {
  if (!sortConfig || !sortConfig.direction) {
    return invoices;
  }

  return [...invoices].sort((a: any, b: any) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};