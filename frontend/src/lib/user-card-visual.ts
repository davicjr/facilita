import { normalizeImagePosition } from './image';

export const defaultUserCardVisual = {
  imagePosition: '50% 50%',
  imageScale: 1,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const getUserCardVisual = (theme?: unknown) => {
  if (!isRecord(theme) || !isRecord(theme.userCardVisual)) {
    return defaultUserCardVisual;
  }

  const visual = theme.userCardVisual;
  const imagePosition =
    typeof visual.imagePosition === 'string'
      ? normalizeImagePosition(visual.imagePosition)
      : defaultUserCardVisual.imagePosition;
  const imageScale =
    typeof visual.imageScale === 'number' &&
    Number.isFinite(visual.imageScale) &&
    visual.imageScale >= 1
      ? visual.imageScale
      : defaultUserCardVisual.imageScale;

  return {
    imagePosition,
    imageScale,
  };
};

export const getUserTheme = (theme?: unknown) => (isRecord(theme) ? { ...theme } : {});

export const buildUserTheme = (
  theme: Record<string, unknown>,
  imagePosition: string,
  imageScale: number,
) => ({
  ...theme,
  userCardVisual: {
    imagePosition: normalizeImagePosition(imagePosition),
    imageScale,
  },
});
