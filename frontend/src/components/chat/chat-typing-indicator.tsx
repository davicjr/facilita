'use client';

type ChatTypingIndicatorProps = {
  names: string[];
};

export default function ChatTypingIndicator({ names }: ChatTypingIndicatorProps) {
  if (!names.length) return null;

  const label =
    names.length === 1
      ? `${names[0]} está digitando`
      : `${names.slice(0, 2).join(' e ')} estão digitando`;

  return (
    <div className="flex items-center gap-2 pl-1">
      <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-white/80 px-3 py-1.5 shadow-sm dark:border-white/10 dark:bg-[rgba(19,30,36,0.9)] dark:shadow-[0_8px_18px_rgba(0,0,0,0.18)]">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 dark:bg-cyan-200/70 [animation-delay:-0.24s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 dark:bg-cyan-200/70 [animation-delay:-0.12s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 dark:bg-cyan-200/70" />
      </span>
      <span className="text-[11px] text-muted-foreground/70 dark:text-slate-400">{label}</span>
    </div>
  );
}
