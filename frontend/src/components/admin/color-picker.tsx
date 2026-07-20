'use client';

import { useRef } from 'react';
import { getContrastTextColor } from '@/lib/color';

const PALETTE: string[] = [
  // Blues
  '#3b82f6', '#1d4ed8', '#0ea5e9', '#0891b2',
  // Purples / pinks
  '#8b5cf6', '#6d28d9', '#ec4899', '#be185d',
  // Reds / oranges
  '#ef4444', '#b91c1c', '#f97316', '#c2410c',
  // Yellows / limes
  '#eab308', '#a16207', '#84cc16', '#4d7c0f',
  // Greens / teals
  '#22c55e', '#15803d', '#14b8a6', '#0f766e',
  // Slate / neutrals
  '#64748b', '#334155', '#78716c', '#44403c',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

export default function ColorPicker({ value, onChange, disabled = false }: ColorPickerProps) {
  const customRef = useRef<HTMLInputElement>(null);

  const normalized = value.startsWith('#') ? value.toLowerCase() : `#${value}`.toLowerCase();
  const isCustom = !PALETTE.map((c) => c.toLowerCase()).includes(normalized);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-8 gap-1.5">
        {PALETTE.map((color) => {
          const selected = color.toLowerCase() === normalized;
          return (
            <button
              key={color}
              type="button"
              disabled={disabled}
              onClick={() => onChange(color)}
              title={color}
              className="relative h-7 w-7 rounded-lg border-2 transition-transform duration-100 hover:scale-110 disabled:pointer-events-none disabled:opacity-50"
              style={{
                backgroundColor: color,
                borderColor: selected ? getContrastTextColor(color) : 'transparent',
              }}
            >
              {selected && (
                <span
                  className="absolute inset-0 flex items-center justify-center text-[13px] font-bold leading-none"
                  style={{ color: getContrastTextColor(color) }}
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => customRef.current?.click()}
          title={isCustom ? normalized : 'Cor personalizada'}
          className="relative h-7 w-7 flex-shrink-0 rounded-lg border-2 transition-transform duration-100 hover:scale-110 disabled:pointer-events-none disabled:opacity-50"
          style={{
            backgroundColor: isCustom ? normalized : '#ffffff',
            borderColor: isCustom ? getContrastTextColor(normalized) : 'var(--border)',
          }}
        >
          {!isCustom && (
            <span className="absolute inset-0 flex items-center justify-center text-[15px] leading-none text-muted-foreground">
              +
            </span>
          )}
          {isCustom && (
            <span
              className="absolute inset-0 flex items-center justify-center text-[13px] font-bold leading-none"
              style={{ color: getContrastTextColor(normalized) }}
            >
              ✓
            </span>
          )}
          <input
            ref={customRef}
            type="color"
            value={normalized}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
            tabIndex={-1}
          />
        </button>
        <input
          type="text"
          value={normalized}
          disabled={disabled}
          onChange={(e) => {
            const val = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(val)) onChange(val);
          }}
          onBlur={(e) => {
            if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onChange(normalized);
          }}
          className="fac-input !h-8 !w-[9.5rem] shrink-0 !text-center font-mono tabular-nums !text-[13px]"
          placeholder="#000000"
          maxLength={7}
        />
        <div
          className="h-8 w-8 flex-shrink-0 rounded-lg border border-border"
          style={{ backgroundColor: /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : '#ffffff' }}
        />
      </div>
    </div>
  );
}
