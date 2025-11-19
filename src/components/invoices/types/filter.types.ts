
import { InvoiceStatus } from "./invoice.types";
import { z } from "zod";

export const filterValuesSchema = z.object({
  status: z.enum([
    "draft",
    "pending",
    "needs_payment_link",
    "payment_link_sent",
    "paid",
    "overdue",
    "cancelled",
    "unpaid",
    "all"
  ]).nullable(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  amountMin: z.number().nonnegative().optional(),
  amountMax: z.number().nonnegative().optional()
});

export interface FilterValues {
  status: InvoiceStatus | null;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
    payment_status?: string; // Add this line

}

export const isValidFilterValues = (filters: unknown): filters is FilterValues => {
  try {
    filterValuesSchema.parse(filters);
    return true;
  } catch {
    return false;
  }
};
