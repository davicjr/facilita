'use client';

import { Download, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { serverURL } from '@/lib/api';
import type { ChatMessage } from '@/types';
import {
  IS_IMAGE_URL,
  IS_SERVER_DOCUMENT,
  IS_SERVER_IMAGE,
  detectMessageKind,
  formatChatTimestamp,
} from './chat-helpers';

type ChatMessageBubbleProps = {
  message: ChatMessage;
  isOwn: boolean;
  isFirst: boolean;
  isGroupRoom: boolean;
  onEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
};

function resolveUrl(path: string): string {
  return path.startsWith('/') ? `${serverURL}${path}` : path;
}

function getFilenameFromPath(path: string): string {
  try {
    return decodeURIComponent(path.split('/').pop() ?? 'Arquivo');
  } catch {
    return path.split('/').pop() ?? 'Arquivo';
  }
}

function linkifyText(text: string, isOwn: boolean): ReactNode[] {
  const regex = /https?:\/\/[^\s]+/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>);
    }
    const url = match[0];
    nodes.push(
      <a
        key={match.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`underline underline-offset-2 transition-opacity hover:opacity-80 ${
          isOwn
            ? 'text-primary-foreground/90 decoration-primary-foreground/40'
            : 'text-primary decoration-primary/40'
        }`}
      >
        {url}
      </a>,
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>);
  }

  return nodes;
}

export default function ChatMessageBubble({
  message,
  isOwn,
  isFirst,
  isGroupRoom,
  onEdit,
  onDelete,
}: ChatMessageBubbleProps) {
  const deleted = Boolean(message.deletedAt);
  const kind = deleted ? 'text' : detectMessageKind(message.content.trim());

  const meta = (
    <span
      className={`inline-flex shrink-0 items-center gap-1 text-[11px] leading-none tabular-nums ${
        isOwn ? 'text-primary-foreground/50 dark:text-white/55' : 'text-muted-foreground/55 dark:text-slate-400'
      }`}
    >
      {message.editedAt && !deleted ? (
        <span className="not-italic opacity-80">editada</span>
      ) : null}
      <span>{formatChatTimestamp(message.createdAt)}</span>
      {isOwn && !deleted ? (
        <span className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onEdit(message)}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full transition hover:bg-white/20 dark:hover:bg-white/10"
            aria-label="Editar"
          >
            <Pencil className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(message)}
            className="inline-flex h-4 w-4 items-center justify-center rounded-full transition hover:bg-white/20 dark:hover:bg-white/10"
            aria-label="Apagar"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </span>
      ) : null}
    </span>
  );

  function renderContent() {
    if (deleted) {
      return (
        <div className="flex items-end gap-2">
          <p className="flex-1 text-[13px] italic leading-relaxed opacity-60">
            Mensagem apagada
          </p>
          {meta}
        </div>
      );
    }

    const trimmed = message.content.trim();

    if (kind === 'server-image' || kind === 'external-image') {
      const src = kind === 'server-image' ? resolveUrl(trimmed) : trimmed;
      return (
        <div>
          <a href={src} target="_blank" rel="noopener noreferrer">
            <img
              src={src}
              alt="Imagem"
              className="max-h-[280px] max-w-full rounded-[10px] object-cover"
              loading="lazy"
            />
          </a>
          <div className="mt-1 flex justify-end">{meta}</div>
        </div>
      );
    }

    if (kind === 'server-file') {
      return (
        <div>
          <a
            href={resolveUrl(trimmed)}
            target="_blank"
            rel="noopener noreferrer"
            download
            className={`flex items-center gap-3 rounded-[10px] border px-4 py-2.5 text-[13px] transition ${
              isOwn
                ? 'border-white/20 bg-white/10 hover:bg-white/15 dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12'
                : 'border-border/70 bg-muted/30 hover:bg-muted/50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]'
            }`}
          >
            <Download className="h-4 w-4 shrink-0 opacity-60" />
            <span className="truncate">{getFilenameFromPath(trimmed)}</span>
          </a>
          <div className="mt-1 flex justify-end">{meta}</div>
        </div>
      );
    }

    // Mixed: text + trailing attachment
    const lines = trimmed.split('\n');
    const lastLine = lines[lines.length - 1]?.trim() ?? '';
    const hasTrailingAttachment =
      lines.length > 1 &&
      (IS_SERVER_IMAGE.test(lastLine) ||
        IS_SERVER_DOCUMENT.test(lastLine) ||
        IS_IMAGE_URL.test(lastLine));

    if (hasTrailingAttachment) {
      const textPart = lines.slice(0, -1).join('\n');
      const attachKind = detectMessageKind(lastLine);

      return (
        <div className="space-y-2">
          <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed">
            {linkifyText(textPart, isOwn)}
          </p>
          {attachKind === 'server-image' || attachKind === 'external-image' ? (
            <a href={resolveUrl(lastLine)} target="_blank" rel="noopener noreferrer">
              <img
                src={resolveUrl(lastLine)}
                alt="Imagem"
                className="max-h-[240px] max-w-full rounded-[10px] object-cover"
                loading="lazy"
              />
            </a>
          ) : (
            <a
              href={resolveUrl(lastLine)}
              target="_blank"
              rel="noopener noreferrer"
              download
              className={`flex items-center gap-3 rounded-[10px] border px-4 py-2.5 text-[13px] transition ${
                isOwn
                  ? 'border-white/20 bg-white/10 hover:bg-white/15 dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12'
                  : 'border-border/70 bg-muted/30 hover:bg-muted/50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]'
              }`}
            >
              <Download className="h-4 w-4 shrink-0 opacity-60" />
              <span className="truncate">{getFilenameFromPath(lastLine)}</span>
            </a>
          )}
          <div className="flex justify-end">{meta}</div>
        </div>
      );
    }

    // Pure text — flex items-end so meta sits on the same line as the last word
    return (
      <div className="flex items-end gap-2">
        <p className="flex-1 min-w-0 whitespace-pre-wrap break-words text-[14px] leading-relaxed">
          {linkifyText(message.content, isOwn)}
        </p>
        {meta}
      </div>
    );
  }

  return (
    <div
      className={`group flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${
        isFirst ? 'mt-4' : 'mt-0.5'
      }`}
    >
      <div className="max-w-[min(480px,84%)]">
        {!isOwn && isFirst && isGroupRoom ? (
          <p className="mb-1 ml-1 text-[11px] font-semibold text-muted-foreground">
            {message.sender.name?.trim() || 'Usuario'}
          </p>
        ) : null}

        <div
          className={`rounded-[18px] px-4 py-2.5 ${
            isOwn
              ? 'bg-primary text-primary-foreground shadow-[0_4px_16px_rgba(0,0,0,0.13)] dark:bg-[linear-gradient(135deg,rgba(52,91,106,0.96),rgba(28,53,64,0.98))] dark:text-slate-50 dark:shadow-[0_10px_28px_rgba(3,10,14,0.34)]'
              : 'border border-border/40 bg-white/92 text-foreground shadow-[0_2px_6px_rgba(0,0,0,0.04)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(22,31,37,0.96),rgba(18,26,31,0.98))] dark:text-slate-100 dark:shadow-[0_10px_24px_rgba(0,0,0,0.18)]'
          } ${deleted ? 'opacity-50' : ''}`}
        >
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
