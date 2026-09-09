import { Fragment } from 'react';
import { cn } from '../../utils/cn';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = new Set<number>();
  pages.add(1);
  pages.add(totalPages);
  for (let p = page - 1; p <= page + 1; p += 1) {
    if (p >= 1 && p <= totalPages) pages.add(p);
  }
  const pageList = Array.from(pages).sort((a, b) => a - b);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>
      {pageList.map((p, index) => {
        const previous = index > 0 ? pageList[index - 1] : undefined;
        return (
          <Fragment key={p}>
            {previous !== undefined && p - previous > 1 && (
              <span aria-hidden="true" className="px-1 text-sm text-gray-400">…</span>
            )}
            <button
              type="button"
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onChange(p)}
              className={cn(
                'inline-flex items-center justify-center rounded-md px-3 py-1 text-sm transition-colors',
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              {p}
            </button>
          </Fragment>
        );
      })}
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-1 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </nav>
  );
}

export default Pagination;