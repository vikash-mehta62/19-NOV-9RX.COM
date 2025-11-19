import { Button } from "./button";


interface PaginationControlsProps {
    currentPage: number;
    totalItems: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  }
  
  export const PaginationControls = ({
    currentPage,
    totalItems,
    pageSize,
    onPageChange,
  }: PaginationControlsProps) => {
    const totalPages = Math.ceil(totalItems / pageSize);
  
    return (
      <div className="flex justify-end mt-4 space-x-2">
        <Button
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Previous
        </Button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <Button
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    );
  };
  