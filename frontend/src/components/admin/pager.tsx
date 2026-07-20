'use client';

type AdminPagerProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function AdminPager({
  page,
  totalPages,
  onPageChange,
}: AdminPagerProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="motion-fade-up flex flex-col gap-3 border-t border-border/60 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex w-full gap-2 sm:w-auto">
        <button
          type="button"
          className="motion-press w-full rounded-lg border border-border/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground disabled:opacity-40 sm:w-auto"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          Voltar
        </button>
        <button
          type="button"
          className="motion-press w-full rounded-lg border border-border/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-foreground disabled:opacity-40 sm:w-auto"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Avançar
        </button>
      </div>
    </div>
  );
}
