import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PageListPaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

type PageToken = number | 'gap-before' | 'gap-after';

function visiblePageNumbers(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  // Always display first and last; show two neighbors around the selected page.
  const indexes = new Set<number>([1, totalPages]);
  for (let page = Math.max(1, currentPage - 2); page <= Math.min(totalPages, currentPage + 2); page++) {
    indexes.add(page);
  }

  const sorted = [...indexes].sort((a, b) => a - b);
  const tokens: PageToken[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      tokens.push(index === 1 ? 'gap-before' : 'gap-after');
    }
    tokens.push(page);
  });
  return tokens;
}

export const PageListPagination: React.FC<PageListPaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  itemLabel = 'data',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const first = totalItems ? (safePage - 1) * pageSize + 1 : 0;
  const last = Math.min(totalItems, safePage * pageSize);
  const navigate = (page: number) => onPageChange(Math.max(1, Math.min(page, totalPages)));

  const baseButton = 'inline-flex min-w-8 h-8 items-center justify-center rounded-lg border border-slate-200 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-35 disabled:cursor-not-allowed';
  return (
    <nav className="flex flex-wrap items-center justify-end gap-2.5" aria-label={'Navigasi halaman ' + itemLabel}>
      <span className="text-[11px] text-slate-500 whitespace-nowrap">
        {first}–{last} dari {totalItems.toLocaleString('id-ID')} {itemLabel}
      </span>
      <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-0.5">
        <button type="button" onClick={() => navigate(safePage - 1)} disabled={safePage === 1}
          className={baseButton + ' bg-white text-slate-600 hover:bg-slate-100'}
          aria-label="Halaman sebelumnya" title="Halaman sebelumnya">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {visiblePageNumbers(safePage, totalPages).map((token) =>
          typeof token === 'number' ? (
            <button key={token} type="button" onClick={() => navigate(token)}
              className={baseButton + (token === safePage
                ? ' border-blue-600 bg-blue-600 text-white shadow-sm'
                : ' bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50')}
              aria-label={'Halaman ' + token}
              aria-current={token === safePage ? 'page' : undefined}>
              {token}
            </button>
          ) : (
            <span key={token} aria-hidden="true" className="flex w-4 h-8 items-center justify-center text-slate-400 text-xs">
              …
            </span>
          )
        )}
        <button type="button" onClick={() => navigate(safePage + 1)} disabled={safePage === totalPages}
          className={baseButton + ' bg-white text-slate-600 hover:bg-slate-100'}
          aria-label="Halaman berikutnya" title="Halaman berikutnya">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      {totalPages > 7 && (
        <label className="flex items-center gap-1.5 text-[11px] text-slate-500 whitespace-nowrap">
          Ke halaman
          <select
            aria-label="Pilih halaman"
            value={safePage}
            onChange={(event) => navigate(Number(event.target.value))}
            className="h-8 max-w-20 rounded-lg border border-slate-200 bg-white px-1 text-xs font-semibold text-slate-700"
          >
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
              <option key={number} value={number}>{number}</option>
            ))}
          </select>
        </label>
      )}
    </nav>
  );
};
