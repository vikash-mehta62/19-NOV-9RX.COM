import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  className?: string;
  mobileLabel?: string; // Label to show on mobile
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  className?: string;
  emptyState?: ReactNode;
}

export function ResponsiveTable<T extends { id: string }>({
  data,
  columns,
  onRowClick,
  className,
  emptyState,
}: ResponsiveTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table className={className}>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow
                key={item.id}
                onClick={() => onRowClick?.(item)}
                className={cn(onRowClick && "cursor-pointer hover:bg-muted")}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.render
                      ? column.render(item)
                      : (item as any)[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {data.map((item) => (
          <Card
            key={item.id}
            onClick={() => onRowClick?.(item)}
            className={cn(
              "transition-all",
              onRowClick && "cursor-pointer hover:shadow-md active:scale-[0.98]"
            )}
          >
            <CardContent className="p-4">
              <div className="space-y-2">
                {columns.map((column) => (
                  <div key={column.key} className="flex justify-between items-start gap-2">
                    <span className="text-sm font-medium text-gray-600 min-w-[100px]">
                      {column.mobileLabel || column.label}:
                    </span>
                    <span className="text-sm text-gray-900 text-right flex-1">
                      {column.render
                        ? column.render(item)
                        : (item as any)[column.key]}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
