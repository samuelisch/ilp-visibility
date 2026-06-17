import { Button } from './ui/Button';

export function Pagination({
  page,
  pageCount,
  onPage,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-3 flex items-center gap-3 text-sm text-muted">
      <Button variant="ghost" disabled={page === 0} onClick={() => onPage(page - 1)}>
        Prev
      </Button>
      <span className="tnum">
        Page {page + 1} of {pageCount}
      </span>
      <Button variant="ghost" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}>
        Next
      </Button>
    </div>
  );
}
