import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { SystemConfig } from '@prisma/client';
import { mkdir } from 'fs/promises';
import { isAbsolute, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import {
  SHORTCUT_CATALOG_CONFIG_KEY,
  SYSTEM_CONFIG_DEFAULTS,
} from './system-config.defaults';
import { ShortcutCatalogItemDto } from './dto/update-shortcut-catalog.dto';
import { ShortcutCatalogItem } from './shortcut-catalog.types';
import { systemConfigStore } from './system-config.store';
import { UpdateSystemConfigDto } from './dto/update-system-config.dto';

const findDefault = (key: string) =>
  SYSTEM_CONFIG_DEFAULTS.find((entry) => entry.key === key);

const SHORTCUT_MODIFIER_ORDER = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const;
const SHORTCUT_MODIFIER_SET = new Set<string>(SHORTCUT_MODIFIER_ORDER);
const BUILTIN_SHORTCUT_COMBOS = new Set(['Ctrl+B']);

@Injectable()
export class SystemConfigService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.syncStore();
  }

  async syncStore() {
    try {
      const configs = await this.prisma.systemConfig.findMany({
        select: { key: true, value: true },
      });
      systemConfigStore.hydrate(configs);
    } catch (error) {
      console.warn('Falha ao carregar SystemConfig, usando defaults.', error);
    }
  }

  findAll() {
    return this.prisma.systemConfig.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async findOne(key: string) {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    if (!config) {
      throw new NotFoundException('Configuracao nao encontrada.');
    }
    return config;
  }

  findShortcutCatalog() {
    const raw = systemConfigStore.getString(SHORTCUT_CATALOG_CONFIG_KEY, '[]');

    try {
      return this.parseShortcutCatalog(raw);
    } catch (error) {
      console.warn('Falha ao carregar catalogo de atalhos, usando lista vazia.', error);
      return [];
    }
  }

  async update(key: string, data: UpdateSystemConfigDto) {
    const config = await this.prisma.systemConfig.findUnique({ where: { key } });
    if (!config) {
      throw new NotFoundException('Configuracao nao encontrada.');
    }
    if (!config.isEditable) {
      throw new BadRequestException('Configuracao nao editavel.');
    }

    const normalizedValue = await this.normalizeValue(config, data.value);
    const updated = await this.prisma.systemConfig.update({
      where: { key },
      data: { value: normalizedValue },
    });

    systemConfigStore.set(updated.key, updated.value);
    return updated;
  }

  async updateShortcutCatalog(items: ShortcutCatalogItemDto[]) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: SHORTCUT_CATALOG_CONFIG_KEY },
    });

    if (!config) {
      throw new NotFoundException('Catalogo de atalhos nao encontrado.');
    }

    const serialized = JSON.stringify(this.normalizeShortcutCatalog(items));
    const updated = await this.prisma.systemConfig.update({
      where: { key: SHORTCUT_CATALOG_CONFIG_KEY },
      data: { value: serialized },
    });

    systemConfigStore.set(updated.key, updated.value);
    return this.parseShortcutCatalog(updated.value);
  }

  resolvePath(key: string, fallback: string) {
    const entry = systemConfigStore.get(key);
    const value = (entry ?? fallback).trim();
    if (!value) {
      return resolve(process.cwd(), fallback);
    }
    return isAbsolute(value) ? value : resolve(process.cwd(), value);
  }

  getBoolean(key: string, fallback: boolean) {
    return systemConfigStore.getBoolean(key, fallback);
  }

  getNumber(key: string, fallback: number) {
    return systemConfigStore.getNumber(key, fallback);
  }

  getString(key: string, fallback: string) {
    return systemConfigStore.getString(key, fallback);
  }

  private async normalizeValue(config: SystemConfig, input: unknown) {
    switch (config.type) {
      case 'boolean':
        return this.normalizeBoolean(input);
      case 'number':
        return this.normalizeNumber(input);
      case 'time':
        return this.normalizeTime(input);
      case 'path':
        return this.normalizePath(input);
      default:
        return this.normalizeString(input, config.key);
    }
  }

  private normalizeBoolean(input: unknown) {
    if (typeof input === 'boolean') {
      return input ? 'true' : 'false';
    }
    if (typeof input === 'string') {
      const value = input.trim().toLowerCase();
      if (value === 'true' || value === 'false') {
        return value;
      }
    }
    throw new BadRequestException('Valor booleano invalido.');
  }

  private normalizeNumber(input: unknown) {
    const parsed =
      typeof input === 'number' ? input : Number(String(input).trim());
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException('Valor numerico invalido.');
    }
    if (parsed < 0) {
      throw new BadRequestException('Valor numerico deve ser positivo.');
    }
    return String(Math.floor(parsed));
  }

  private normalizeTime(input: unknown) {
    const value = String(input ?? '').trim();
    const pattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!pattern.test(value)) {
      throw new BadRequestException('Horario invalido. Use HH:MM.');
    }
    return value;
  }

  private async normalizePath(input: unknown) {
    const value = String(input ?? '').trim();
    if (!value) {
      throw new BadRequestException('Diretorio invalido.');
    }
    const resolved = isAbsolute(value) ? value : resolve(process.cwd(), value);
    await mkdir(resolved, { recursive: true });
    return value;
  }

  private normalizeString(input: unknown, key: string) {
    const value = String(input ?? '').trim();
    if (!value) {
      const fallback = findDefault(key)?.value;
      if (fallback) {
        return fallback;
      }
      throw new BadRequestException('Valor invalido.');
    }
    return value;
  }

  private parseShortcutCatalog(raw: string) {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return this.normalizeShortcutCatalog(parsed);
  }

  private normalizeShortcutCatalog(items: unknown[]) {
    const ids = new Set<string>();
    const combos = new Set<string>();

    return items.map((item) => {
      const normalized = this.normalizeShortcutItem(item);
      const combo = this.buildShortcutCombo(normalized.keys);

      if (BUILTIN_SHORTCUT_COMBOS.has(combo)) {
        throw new BadRequestException('Ctrl+B ja e reservado para a busca global.');
      }

      if (ids.has(normalized.id)) {
        throw new BadRequestException('Existem atalhos duplicados no catalogo.');
      }

      if (combos.has(combo)) {
        throw new BadRequestException('Nao e permitido repetir combinacoes de teclas.');
      }

      ids.add(normalized.id);
      combos.add(combo);
      return normalized;
    });
  }

  private normalizeShortcutItem(input: unknown): ShortcutCatalogItem {
    const item = (input ?? {}) as Record<string, unknown>;
    const id = String(item.id ?? '').trim();
    const title = String(item.title ?? '').trim();
    const description = String(item.description ?? '').trim();
    const context = String(item.context ?? '').trim();

    if (!id || !title || !description || !context) {
      throw new BadRequestException('Todos os campos do atalho sao obrigatorios.');
    }

    return {
      id,
      title,
      description,
      context,
      keys: this.normalizeShortcutKeys(item.keys),
      target: this.normalizeShortcutTarget(item.target),
      openInNewTab: Boolean(item.openInNewTab),
    };
  }

  private normalizeShortcutKeys(input: unknown) {
    if (!Array.isArray(input) || input.length < 2 || input.length > 4) {
      throw new BadRequestException('Cada atalho precisa ter entre 2 e 4 teclas.');
    }

    const normalized = input.map((token) => this.normalizeShortcutToken(token));
    const unique = new Set(normalized);

    if (unique.size !== normalized.length) {
      throw new BadRequestException('As teclas do atalho nao podem se repetir.');
    }

    const modifiers = SHORTCUT_MODIFIER_ORDER.filter((key) => unique.has(key));
    const primaryKeys = normalized.filter((key) => !SHORTCUT_MODIFIER_SET.has(key));

    if (primaryKeys.length !== 1) {
      throw new BadRequestException(
        'Cada atalho precisa ter modificadores e uma tecla principal.',
      );
    }

    return [...modifiers, primaryKeys[0]];
  }

  private normalizeShortcutToken(input: unknown) {
    const token = String(input ?? '')
      .trim()
      .replace(/\s+/g, '');

    if (!token) {
      throw new BadRequestException('Tecla invalida no atalho.');
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

    throw new BadRequestException(`Tecla nao suportada no atalho: ${token}.`);
  }

  private normalizeShortcutTarget(input: unknown) {
    const target = String(input ?? '').trim();

    if (!target) {
      throw new BadRequestException('Destino do atalho obrigatorio.');
    }

    if (target.startsWith('action:')) {
      return target;
    }

    if (target.startsWith('/')) {
      return target;
    }

    try {
      const url = new URL(target);

      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('unsupported');
      }

      return target;
    } catch {
      throw new BadRequestException(
        'Destino invalido. Use uma rota interna iniciando com / ou uma URL http(s).',
      );
    }
  }

  private buildShortcutCombo(keys: string[]) {
    return keys.join('+');
  }
}
