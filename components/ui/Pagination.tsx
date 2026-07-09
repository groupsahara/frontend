"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
  itemsPerPageOptions?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  itemsPerPageOptions = [10, 20, 50, 100],
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const handlePrev = () => onPageChange(Math.max(currentPage - 1, 1));
  const handleNext = () => onPageChange(Math.min(currentPage + 1, totalPages));

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 border-t border-border text-xs text-muted-foreground gap-3">
      <div className="flex items-center gap-4">
        <span>
          Showing <span className="text-foreground font-medium">{startIndex + 1}</span> to{" "}
          <span className="text-foreground font-medium">{endIndex}</span> of{" "}
          <span className="text-foreground font-medium">{totalItems}</span> entries
        </span>
        {onItemsPerPageChange && (
          <label className="flex items-center gap-1.5">
            <span>Rows per page</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="h-7 pl-2 pr-6 rounded-md border border-border bg-background text-foreground text-xs outline-none focus:border-ring transition-colors cursor-pointer"
            >
              {itemsPerPageOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex gap-1">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="h-8 px-3 rounded-md border border-border text-muted-foreground text-xs hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`h-8 w-8 rounded-md border text-xs transition-colors hidden sm:flex items-center justify-center ${
              currentPage === page
                ? "bg-foreground text-background font-medium"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="h-8 px-3 rounded-md border border-border text-muted-foreground text-xs hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
