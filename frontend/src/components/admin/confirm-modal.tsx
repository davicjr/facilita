'use client';

import { useEffect, useRef } from 'react';
import AdminModal from '@/components/admin/modal';

type ConfirmModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = 'Remover',
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open || loading) return;
    cancelButtonRef.current?.focus();
  }, [loading, open]);

  return (
    <AdminModal
      open={open}
      title={title}
      description={description}
      onClose={loading ? () => undefined : onClose}
      panelClassName="max-w-[480px]"
      footer={
        <>
          <button
            ref={cancelButtonRef}
            type="button"
            className="fac-button-secondary text-[11px]"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="fac-button-secondary text-[11px] !border-destructive/40 !bg-destructive/5 !text-destructive hover:!bg-destructive/10"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Removendo...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Esta ação não pode ser desfeita.
      </div>
    </AdminModal>
  );
}
