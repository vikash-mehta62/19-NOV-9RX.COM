import { Pagination } from "@/components/ui/pagination";

interface LocationTablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
}

export function LocationTablePagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize = 10,
  totalItems,
}: LocationTablePaginationProps) {
  // Calculate totalItems if not provided
  const calculatedTotalItems = totalItems ?? totalPages * pageSize;
  
  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      totalItems={calculatedTotalItems}
      onPageChange={onPageChange}
      onPageSizeChange={() => {}} // Not used in this context
      className="mt-4"
    />
  );
}