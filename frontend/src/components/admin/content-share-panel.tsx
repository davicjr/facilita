'use client';

import { formatSharePreview, formatShareSummary } from '@/lib/shares';
import type { UserPreview } from '@/types';

type ContentSharePanelProps = {
  currentEditing: { shareCount?: number; sharedWithPreview?: UserPreview[] } | null;
  unsavedMessage: string;
  unsavedPreviewMessage: string;
  disabled: boolean;
  onShare: () => void;
};

export default function ContentSharePanel({
  currentEditing,
  unsavedMessage,
  unsavedPreviewMessage,
  disabled,
  onShare,
}: ContentSharePanelProps) {
  return (
    <div className="sm:col-span-2 rounded-2xl border border-border/70 bg-card/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="fac-form-title">Compartilhamento</p>
          <p className="text-[13px] text-foreground">
            {currentEditing ? formatShareSummary(currentEditing.shareCount) : unsavedMessage}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {currentEditing
              ? formatSharePreview(currentEditing.sharedWithPreview) ||
                'Compartilhe sem alterar a visibilidade do item.'
              : unsavedPreviewMessage}
          </p>
        </div>

        <button
          type="button"
          className="fac-button-secondary !h-10 !px-4 text-[11px]"
          onClick={onShare}
          disabled={!currentEditing || disabled}
        >
          Compartilhar
        </button>
      </div>
    </div>
  );
}
