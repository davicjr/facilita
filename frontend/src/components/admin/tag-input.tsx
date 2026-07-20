'use client';

import { useRef, useState } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function TagInput({
  value,
  onChange,
  placeholder = 'Adicionar tag...',
  disabled = false,
}: TagInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
    setInput('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const handleBlur = () => {
    if (input.trim()) addTag(input);
  };

  return (
    <div
      className={`fac-input !h-auto min-h-10 cursor-text flex-wrap !px-2 !py-1.5 flex items-center gap-1.5 ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-[12px] font-medium text-primary dark:bg-primary/20"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="ml-0.5 text-primary/60 hover:text-primary leading-none"
              tabIndex={-1}
            >
              ×
            </button>
          )}
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={value.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="min-w-[120px] flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground/70 outline-none"
      />
    </div>
  );
}
