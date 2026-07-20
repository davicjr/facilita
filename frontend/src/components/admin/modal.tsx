'use client';

import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type AdminModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  panelClassName?: string;
};

export default function AdminModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  panelClassName,
}: AdminModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fac-modal-root" aria-hidden={!open}>
      <button
        type="button"
        onClick={onClose}
        className="fac-modal-backdrop"
        aria-label="Fechar modal"
      />

      <div
        className={`fac-modal-panel ${panelClassName ?? ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="fac-modal-head">
          <div>
            <p id={titleId} className="fac-modal-title">
              {title}
            </p>
            {description ? (
              <p className="fac-modal-description">{description}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="fac-button-secondary !h-10 !px-4 text-[11px]">
            Fechar
          </button>
        </div>

        <div className="fac-modal-content">{children}</div>

        {footer ? <div className="fac-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

