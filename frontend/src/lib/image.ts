import { serverURL } from './api';

export function normalizeImagePosition(position?: string | null): string {
  if (!position) return '50% 50%';

  const [x = '50%', y = '50%'] = position.trim().split(/\s+/);
  const withPercent = (value: string) => (value.includes('%') ? value : `${value}%`);

  return `${withPercent(x)} ${withPercent(y)}`;
}

export function resolveAssetUrl(path?: string | null): string {
  if (!path) return '';
  return path.startsWith('http') ? path : `${serverURL}${path}`;
}

export function parseImagePosition(position?: string | null): { x: number; y: number } {
  const [xRaw = '50%', yRaw = '50%'] = normalizeImagePosition(position).split(' ');
  const parse = (value: string) => {
    const numeric = Number.parseInt(value, 10);
    if (Number.isNaN(numeric)) return 50;
    return Math.max(0, Math.min(100, numeric));
  };

  return {
    x: parse(xRaw),
    y: parse(yRaw),
  };
}
