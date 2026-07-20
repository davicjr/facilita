'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Paperclip, SendHorizonal, X } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import type { ChatMessage } from '@/types';

type Attachment = {
  type: 'image' | 'file';
  fileName: string;
  serverPath: string;
  previewObjectUrl?: string;
};

type ChatInputProps = {
  roomId: string;
  editingMessage?: ChatMessage | null;
  onSubmit: (content: string) => Promise<unknown>;
  onCancelEdit: () => void;
  onStartTyping: (roomId: string) => void;
  onStopTyping: (roomId: string) => void;
};

export default function ChatInput({
  roomId,
  editingMessage,
  onSubmit,
  onCancelEdit,
  onStartTyping,
  onStopTyping,
}: ChatInputProps) {
  const [value, setValue] = useState(
    () => (editingMessage?.deletedAt ? '' : editingMessage?.content ?? ''),
  );
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 180)}px`;
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || uploading || submitting) return;

    window.requestAnimationFrame(() => {
      textarea.focus();
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
    });
  }, [editingMessage?.id, roomId, submitting, uploading]);

  useEffect(() => {
    return () => {
      if (attachment?.previewObjectUrl) {
        URL.revokeObjectURL(attachment.previewObjectUrl);
      }
    };
  }, [attachment]);

  const uploadFile = async (file: File): Promise<Attachment> => {
    const isImage = file.type.startsWith('image/');
    const formData = new FormData();
    formData.append('file', file);

    const endpoint = isImage ? '/uploads/image' : '/uploads/document';
    const response = await api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      skipNotify: true,
    });

    const previewObjectUrl = isImage ? URL.createObjectURL(file) : undefined;

    return {
      type: isImage ? 'image' : 'file',
      fileName: file.name,
      serverPath: String(response.data.url),
      previewObjectUrl,
    };
  };

  const handleFileSelected = async (file: File) => {
    if (uploading) return;

    if (attachment?.previewObjectUrl) {
      URL.revokeObjectURL(attachment.previewObjectUrl);
    }

    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      setAttachment(uploaded);
    } catch {
      notify.error('Não foi possível enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = event.clipboardData?.files;
    if (files && files.length > 0) {
      event.preventDefault();
      void handleFileSelected(files[0]);
    }
  };

  const clearAttachment = () => {
    if (attachment?.previewObjectUrl) URL.revokeObjectURL(attachment.previewObjectUrl);
    setAttachment(null);
  };

  const handleSubmit = async () => {
    if (uploading || submitting) return;

    const textContent = value.trim();

    let content = '';
    if (attachment) {
      content = textContent
        ? `${textContent}\n${attachment.serverPath}`
        : attachment.serverPath;
    } else {
      content = textContent;
    }

    if (!content) return;

    setSubmitting(true);

    try {
      await onSubmit(content);

      if (attachment?.previewObjectUrl) {
        URL.revokeObjectURL(attachment.previewObjectUrl);
      }

      setAttachment(null);
      setValue('');
      onStopTyping(roomId);

      window.requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.focus();
        textarea.setSelectionRange(0, 0);
      });
    } catch {
      notify.error(
        editingMessage ? 'Nao foi possivel salvar a edicao.' : 'Nao foi possivel enviar a mensagem.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const canSend =
    (value.trim().length > 0 || attachment !== null) && !uploading && !submitting;

  return (
    <div className="border-t border-border/50 bg-white/60 px-4 py-3 dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(18,27,33,0.92),rgba(14,22,27,0.96))]">
      {editingMessage && !editingMessage.deletedAt ? (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-[14px] border border-primary/15 bg-primary/[0.06] px-3 py-2 text-[12px] text-primary dark:border-cyan-400/15 dark:bg-cyan-400/8 dark:text-cyan-200">
          <span>Editando mensagem</span>
          <button
            type="button"
            onClick={() => {
              setValue('');
              onCancelEdit();
            }}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-primary/10 dark:hover:bg-cyan-300/10"
            aria-label="Cancelar edição"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {attachment ? (
        <div className="mb-2 flex items-center gap-2 rounded-[14px] border border-border/60 bg-card/80 p-2 shadow-sm dark:border-white/10 dark:bg-[rgba(19,29,35,0.88)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
          {attachment.type === 'image' && attachment.previewObjectUrl ? (
            <img
              src={attachment.previewObjectUrl}
              alt=""
              className="h-12 w-12 rounded-[10px] object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-muted/40 dark:bg-white/[0.04]">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-foreground">
              {attachment.fileName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {attachment.type === 'image' ? 'Imagem' : 'Arquivo'}
            </p>
          </div>
          <button
            type="button"
            onClick={clearAttachment}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted/60 dark:hover:bg-white/[0.06]"
            aria-label="Remover anexo"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        {!editingMessage ? (
          <>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              title="Enviar imagem"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/50 hover:text-foreground disabled:opacity-40 dark:text-slate-400 dark:hover:bg-[rgba(50,77,90,0.24)] dark:hover:text-slate-100"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Enviar arquivo"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted/50 hover:text-foreground disabled:opacity-40 dark:text-slate-400 dark:hover:bg-[rgba(50,77,90,0.24)] dark:hover:text-slate-100"
            >
              <Paperclip className="h-4 w-4" />
            </button>
          </>
        ) : null}

        <div className="flex min-w-0 flex-1 items-end gap-2 rounded-[20px] border border-border/55 bg-card/85 px-4 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-[rgba(16,25,31,0.98)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_12px_28px_rgba(0,0,0,0.28)]">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => {
              const nextValue = event.target.value;
              setValue(nextValue);
              if (nextValue.trim()) onStartTyping(roomId);
              else onStopTyping(roomId);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            onPaste={handlePaste}
            rows={1}
            placeholder={
              uploading
                ? 'Enviando...'
                : submitting
                  ? 'Salvando...'
                : editingMessage
                  ? 'Editar mensagem...'
                  : 'Mensagem...'
            }
            disabled={uploading || submitting}
            className="max-h-[160px] min-h-[28px] flex-1 resize-none bg-transparent text-[14px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70 disabled:opacity-50 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSend}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-35 dark:bg-[linear-gradient(135deg,rgba(92,149,170,0.96),rgba(61,111,130,0.96))] dark:text-slate-950 dark:shadow-[0_8px_18px_rgba(36,82,99,0.3)]"
            aria-label={editingMessage ? 'Salvar edição' : 'Enviar mensagem'}
          >
            <SendHorizonal className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFileSelected(f);
          e.target.value = '';
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFileSelected(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}
