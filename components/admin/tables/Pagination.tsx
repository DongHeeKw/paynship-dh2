'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
}: PaginationProps) {
  const pages = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100">
      <div className="text-sm text-gray-500">
        총 <span className="font-medium text-gray-900">{total}</span>개
      </div>

      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
        >
          <i className="fas fa-chevron-left"></i>
        </button>

        {/* First page */}
        {startPage > 1 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors"
            >
              1
            </button>
            {startPage > 2 && <span className="px-2 text-gray-400">...</span>}
          </>
        )}

        {/* Page numbers */}
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              p === page
                ? 'bg-purple-600 text-white'
                : 'hover:bg-gray-100'
            }`}
          >
            {p}
          </button>
        ))}

        {/* Last page */}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="px-2 text-gray-400">...</span>
            )}
            <button
              onClick={() => onPageChange(totalPages)}
              className="px-3 py-1.5 text-sm rounded-lg hover:bg-gray-100 transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
        >
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  );
}
