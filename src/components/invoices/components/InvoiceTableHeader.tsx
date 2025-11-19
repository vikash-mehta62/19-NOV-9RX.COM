import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";
import { SortConfig, TableColumn } from "../types/table.types";

interface InvoiceTableHeaderProps {
  onSort: (key: string) => void;
  sortConfig: SortConfig | null;
}

export const InvoiceTableHeader = ({ onSort, sortConfig }: InvoiceTableHeaderProps) => {
  const columns: TableColumn[] = [
    { key: "id", label: "Invoice ID", sortable: true },
    { key: "orderNumber", label: "Order Number", sortable: true },
    { key: "customerName", label: "Customer", sortable: true },
    { key: "amount", label: "Amount", sortable: true },
    { key: "status", label: "Payment Status", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "actions", label: "Actions", sortable: false },
  ];

  return (
    <TableHeader>
      <TableRow>
        {columns.map((column) => (
          <TableHead
            key={column.key}
            className={`text-center  border-gray-300 ${
              column.sortable ? "cursor-pointer select-none" : ""
            }`}
            onClick={() => column.sortable && onSort(column.key)}
          >
            <div className="flex justify-center items-center space-x-1">
              <span>{column.label}</span>
              {column.sortable && (
                <ArrowUpDown
                  className={`h-4 w-4 ${
                    sortConfig?.key === column.key
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                />
              )}
            </div>
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
};
