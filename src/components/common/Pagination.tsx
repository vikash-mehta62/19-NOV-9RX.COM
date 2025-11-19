import React from "react";

interface PaginationProps {
  totalOrders: number;
  page: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  limit: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  totalOrders,
  page,
  setPage,
  limit,
  setLimit,
}) => {
  const totalPages = Math.ceil(totalOrders / limit);

  const getPages = () => {
    const pages: (number | string)[] = [];
    pages.push(1);

    if (page > 3) pages.push("...");

    for (
      let p = Math.max(2, page - 1);
      p <= Math.min(totalPages - 1, page + 1);
      p++
    ) {
      pages.push(p);
    }

    if (page < totalPages - 2) pages.push("...");

    if (totalPages > 1) pages.push(totalPages);

    return pages;
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "all") {
      setLimit(10000); // ✅ All = 10k
      setPage(1);
    } else {
      const numVal = Number(val);
      if (!isNaN(numVal)) {
        setLimit(numVal);
        setPage(1);
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
      {/* Rows per page selector — always visible */}
      <select
        value={limit >= 10000 ? "all" : limit}
        onChange={handleLimitChange}
        className="border rounded px-2 py-1"
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
        <option value="all">All</option>
      </select>

      {/* Only show pagination buttons if more than one page */}
      {totalPages > 1 && (
        <>
          {/* Prev Button */}
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Prev
          </button>

          {/* Page Numbers */}
          {getPages().map((p, idx) =>
            p === "..." ? (
              <span key={idx} className="px-3 py-1">
                ...
              </span>
            ) : (
              <button
                key={idx}
                onClick={() => setPage(p as number)}
                className={`px-3 py-1 border rounded ${
                  p === page ? "bg-blue-500 text-white border-blue-500" : ""
                }`}
              >
                {p}
              </button>
            )
          )}

          {/* Next Button */}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </>
      )}
    </div>
  );
};
