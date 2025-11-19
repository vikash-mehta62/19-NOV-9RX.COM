
import { InvoiceTableContainer } from "./components/InvoiceTableContainer";
import { InvoiceStatus } from "./types/invoice.types";

interface DataTableProps {
  filterStatus?: InvoiceStatus;
}

export function DataTable({ filterStatus }: DataTableProps) {
  return <InvoiceTableContainer filterStatus={filterStatus} />;
}
