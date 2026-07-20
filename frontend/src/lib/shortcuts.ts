import type { CustomShortcut } from '@/types';

export type ShortcutDisplayItem = {
  id: string;
  title: string;
  description: string;
  context: string;
  keys: string[];
  source: 'system' | 'custom';
  actionKind: 'GLOBAL_SEARCH' | 'TARGET';
  target?: string;
  openInNewTab?: boolean;
};

const modifierOrder = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const;
const modifierSet = new Set<string>(modifierOrder);

export const BUILTIN_SHORTCUTS: ShortcutDisplayItem[] = [];

export const mapCustomShortcutToDisplay = (
  shortcut: CustomShortcut,
): ShortcutDisplayItem => ({
  ...shortcut,
  source: 'custom',
  actionKind: 'TARGET',
});

export const normalizeShortcutToken = (raw: string) => {
  const token = raw.trim().replace(/\s+/g, '');
  if (!token) {
    return null;
  }

  const normalized = token.toLowerCase();

  if (normalized === 'ctrl' || normalized === 'control') {
    return 'Ctrl';
  }

  if (normalized === 'alt' || normalized === 'option') {
    return 'Alt';
  }

  if (normalized === 'shift') {
    return 'Shift';
  }

  if (
    normalized === 'meta' ||
    normalized === 'cmd' ||
    normalized === 'command' ||
    normalized === 'win' ||
    normalized === 'windows'
  ) {
    return 'Meta';
  }

  if (normalized === 'esc' || normalized === 'escape') {
    return 'Escape';
  }

  if (normalized === 'space') {
    return 'Space';
  }

  if (normalized === 'tab') {
    return 'Tab';
  }

  if (normalized === 'enter' || normalized === 'return') {
    return 'Enter';
  }

  if (normalized === 'arrowup' || normalized === 'up') {
    return 'ArrowUp';
  }

  if (normalized === 'arrowdown' || normalized === 'down') {
    return 'ArrowDown';
  }

  if (normalized === 'arrowleft' || normalized === 'left') {
    return 'ArrowLeft';
  }

  if (normalized === 'arrowright' || normalized === 'right') {
    return 'ArrowRight';
  }

  if (/^f([1-9]|1[0-2])$/i.test(token)) {
    return token.toUpperCase();
  }

  if (/^[a-z0-9]$/i.test(token)) {
    return token.toUpperCase();
  }

  return null;
};

export const normalizeShortcutKeys = (keys: string[]) => {
  if (keys.length < 2 || keys.length > 4) {
    return null;
  }

  const normalized = keys
    .map((token) => normalizeShortcutToken(token))
    .filter((token): token is string => Boolean(token));

  if (normalized.length !== keys.length) {
    return null;
  }

  const unique = new Set(normalized);
  if (unique.size !== normalized.length) {
    return null;
  }

  const modifiers = modifierOrder.filter((token) => unique.has(token));
  const primaryKeys = normalized.filter((token) => !modifierSet.has(token));

  if (primaryKeys.length !== 1) {
    return null;
  }

  return [...modifiers, primaryKeys[0]];
};

export const parseShortcutInput = (input: string) =>
  normalizeShortcutKeys(
    input
      .split('+')
      .map((token) => token.trim())
      .filter(Boolean),
  );

export const buildShortcutCombo = (keys: string[]) => {
  const normalized = normalizeShortcutKeys(keys);
  return normalized ? normalized.join('+') : '';
};

export const formatShortcutInput = (keys: string[]) => keys.join(' + ');

export const getKeyboardEventShortcutKeys = (event: KeyboardEvent) => {
  const mainKey = normalizeShortcutToken(event.key);

  if (!mainKey || modifierSet.has(mainKey)) {
    return null;
  }

  const keys: string[] = [];

  if (event.ctrlKey) {
    keys.push('Ctrl');
  }
  if (event.altKey) {
    keys.push('Alt');
  }
  if (event.shiftKey) {
    keys.push('Shift');
  }
  if (event.metaKey) {
    keys.push('Meta');
  }

  keys.push(mainKey);
  return normalizeShortcutKeys(keys);
};

// ─── Functional actions ───────────────────────────────────────────────────────

export type ShortcutActionId =
  | 'action:open_search'
  | 'action:toggle_theme'
  | 'action:toggle_nav'
  | 'action:toggle_nav_mode'
  | 'action:logout';

export type ShortcutAction = {
  id: ShortcutActionId;
  label: string;
  description: string;
};

export const SHORTCUT_ACTIONS: ShortcutAction[] = [
  {
    id: 'action:open_search',
    label: 'Busca global',
    description: 'Abre a busca global do portal.',
  },
  {
    id: 'action:toggle_theme',
    label: 'Alternar tema',
    description: 'Alterna entre modo claro e escuro.',
  },
  {
    id: 'action:toggle_nav',
    label: 'Recolher barra lateral',
    description: 'Expande ou recolhe a barra lateral.',
  },
  {
    id: 'action:toggle_nav_mode',
    label: 'Modo automático',
    description: 'Alterna entre sidebar manual e automático.',
  },
  {
    id: 'action:logout',
    label: 'Sair',
    description: 'Encerra a sessão atual.',
  },
];

export const isActionShortcutTarget = (target: string): target is ShortcutActionId =>
  target.startsWith('action:');

// ─── Target validation ────────────────────────────────────────────────────────

export const isShortcutTargetValid = (target: string) => {
  const value = target.trim();
  if (!value) {
    return false;
  }

  if (isActionShortcutTarget(value)) {
    return true;
  }

  if (value.startsWith('/')) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const isInternalShortcutTarget = (target: string) => target.trim().startsWith('/');

export const isEditableKeyboardTarget = (target: EventTarget | null) => {
  const element = target as HTMLElement | null;

  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element?.isContentEditable === true ||
    element?.closest('[contenteditable="true"]') !== null ||
    element?.getAttribute('role') === 'textbox'
  );
};
