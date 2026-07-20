'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  hasError?: boolean;
  disabled?: boolean;
  ariaLabelledBy?: string;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      disabled={disabled}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12px] transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground hover:bg-muted disabled:opacity-40'
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Digite o conteúdo...',
  hasError = false,
  disabled = false,
  ariaLabelledBy,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: 'textbox',
        ...(ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {}),
      },
    },
    extensions: [
      StarterKit.configure({
        bulletList: { HTMLAttributes: { class: 'list-disc pl-5' } },
        orderedList: { HTMLAttributes: { class: 'list-decimal pl-5' } },
        blockquote: { HTMLAttributes: { class: 'border-l-2 border-border pl-3 text-muted-foreground' } },
        code: { HTMLAttributes: { class: 'rounded bg-muted px-1 py-0.5 font-mono text-[13px]' } },
        codeBlock: { HTMLAttributes: { class: 'rounded-xl bg-muted p-3 font-mono text-[13px]' } },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline underline-offset-2' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? '' : editor.getHTML();
      onChange(html);
    },
  });

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt('URL do link:');
    if (!url) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div
      className={`overflow-hidden rounded-xl border ${
        hasError ? 'border-destructive' : 'border-border'
      } bg-white/85 dark:bg-card/85`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-2 py-1.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          disabled={disabled}
          title="Negrito"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          disabled={disabled}
          title="Itálico"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          disabled={disabled}
          title="Riscado"
        >
          <s>S</s>
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          disabled={disabled}
          title="Código inline"
        >
          {'<>'}
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          disabled={disabled}
          title="Título"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          disabled={disabled}
          title="Subtítulo"
        >
          H3
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          disabled={disabled}
          title="Lista"
        >
          •—
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          disabled={disabled}
          title="Lista numerada"
        >
          1—
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          disabled={disabled}
          title="Citação"
        >
          ❝
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton onClick={addLink} active={editor.isActive('link')} disabled={disabled} title="Link">
          🔗
        </ToolbarButton>
        {editor.isActive('link') && (
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            disabled={disabled}
            title="Remover link"
          >
            ✕
          </ToolbarButton>
        )}
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3.5 py-3 text-[14px] text-foreground focus-within:outline-none [&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground/60 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
      />
    </div>
  );
}

/** Renderiza HTML gerado pelo Tiptap de forma segura. Notas antigas (texto puro) são exibidas normalmente. */
export function RichTextViewer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const isHtml = content.trimStart().startsWith('<');

  if (isHtml) {
    return (
      <div
        className={`prose prose-sm max-w-none text-[15px] text-foreground leading-relaxed ${className ?? ''}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <p className={`whitespace-pre-wrap text-[15px] leading-relaxed text-foreground ${className ?? ''}`}>
      {content}
    </p>
  );
}
