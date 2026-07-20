export function getContrastTextColor(hexColor: string): string {
  const hex = hexColor.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#263238';

  const value = Number.parseInt(hex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 150 ? '#263238' : '#ffffff';
}
