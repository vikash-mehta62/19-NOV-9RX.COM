import { Button } from "@/components/ui/button";

interface GroupPricingPaginationProps {
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export function GroupPricingPagination({ 
  page, 
  totalPages, 
  loading, 
  onPageChange 
}: GroupPricingPaginationProps) {
  return (
    <div className="mt-4 flex items-center justify-between">
      <Button
        disabled={page === 1 || loading}
        onClick={() => onPageChange(Math.max(page - 1, 1))}
        className="bg-gradient-to-r from-[#e6b980] to-[#eacda3] hover:opacity-90 text-gray-800"
      >
        Previous
      </Button>
      <span className="text-gray-600">
        Page {page} of {totalPages}
      </span>
      <Button
        disabled={page === totalPages || loading}
        onClick={() => onPageChange(Math.min(page + 1, totalPages))}
        className="bg-gradient-to-r from-[#e6b980] to-[#eacda3] hover:opacity-90 text-gray-800"
      >
        Next
      </Button>
    </div>
  );
}