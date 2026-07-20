type StatusBadgeProps = {
  status?: string | null;
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status?.toUpperCase() || 'UNKNOWN';
  const isActive = normalized === 'ACTIVE';
  const className = isActive
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <span
      className={`rounded-md border px-3 py-1 text-[10px] uppercase tracking-[0.25em] ${className}`}
    >
      {normalized}
    </span>
  );
}
