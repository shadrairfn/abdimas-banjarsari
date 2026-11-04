"use client";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages - 1);

  return (
    <div className="admin-pagination">
      <span className="mut" aria-live="polite">
        {total ? current * pageSize + 1 : 0}–{Math.min((current + 1) * pageSize, total)} dari{" "}
        {total}
      </span>
      <label className="page-size">
        Data per halaman
        <select
          aria-label="Data per halaman"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {[5, 10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
      <div>
        <button
          type="button"
          className="btn o sm"
          disabled={current === 0}
          onClick={() => onPageChange(current - 1)}
        >
          Sebelumnya
        </button>
        <button
          type="button"
          className="btn o sm"
          disabled={current >= pages - 1}
          onClick={() => onPageChange(current + 1)}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
