import { isAbsolute, resolve } from 'path';
import { SYSTEM_CONFIG_DEFAULTS } from './system-config.defaults';

type SystemConfigValue = {
  key: string;
  value: string;
};

const buildDefaults = () =>
  SYSTEM_CONFIG_DEFAULTS.reduce<Record<string, string>>((acc, entry) => {
    acc[entry.key] = entry.value;
    return acc;
  }, {});

const store = new Map<string, string>(Object.entries(buildDefaults()));

export const systemConfigStore = {
  get(key: string) {
    return store.get(key);
  },
  set(key: string, value: string) {
    store.set(key, value);
  },
  hydrate(entries: SystemConfigValue[]) {
    store.clear();
    const defaults = buildDefaults();
    Object.entries(defaults).forEach(([key, value]) => {
      store.set(key, value);
    });
    entries.forEach((entry) => {
      if (entry.key) {
        store.set(entry.key, entry.value);
      }
    });
  },
  getString(key: string, fallback: string) {
    return store.get(key) ?? fallback;
  },
  getBoolean(key: string, fallback: boolean) {
    const value = store.get(key);
    if (value === undefined) return fallback;
    return value === 'true';
  },
  getNumber(key: string, fallback: number) {
    const value = store.get(key);
    if (value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  },
};

export const resolveConfigPath = (key: string, fallback: string) => {
  const value = systemConfigStore.getString(key, fallback).trim();
  if (!value) {
    return resolve(process.cwd(), fallback);
  }
  return isAbsolute(value) ? value : resolve(process.cwd(), value);
};
