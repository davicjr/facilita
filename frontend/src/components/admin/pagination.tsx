'use client';

type PaginationProps = {
  page: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPrevious: () => void;
  onNext: () => void;
};

export default function Pagination({
  page,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPrevious,
  onNext,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 rounded-[18px] border border-border bg-white/45 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-secondary/45">
      <p className="text-[12px] text-muted-foreground">
        Página {page} de {totalPages}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!hasPreviousPage}
          className="fac-button-secondary !h-9 !px-4 text-[10px]"
        >
          Anterior
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!hasNextPage}
          className="fac-button-secondary !h-9 !px-4 text-[10px]"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
