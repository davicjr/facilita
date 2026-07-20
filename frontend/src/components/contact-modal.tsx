'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

type ContactModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const staggerStyle = (index: number) =>
  ({ '--stagger-index': index } as CSSProperties);

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [mounted, setMounted] = useState(false);
  const modalState = isOpen ? 'open' : 'closed';

  useEffect(() => {
    setMounted(true);
  }, []);

  const modalMarkup = (
    <div
      className="modal-root fixed inset-0 z-50 flex items-center justify-center px-4 py-8"
      data-state={modalState}
      aria-hidden={!isOpen}
    >
      <button
        type="button"
        onClick={onClose}
        className="modal-backdrop absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        data-state={modalState}
        aria-label="Fechar modal"
      />
      <div
        className="modal-panel surface-strong relative w-full max-w-lg p-6"
        data-state={modalState}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              id="contact-modal-title"
              className="text-xs uppercase tracking-[0.18em] text-muted-foreground"
            >
              Contato
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos aqui para ajudar. Escolha o canal de sua preferência.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="motion-press rounded-lg border border-border/70 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-foreground"
          >
            Fechar
          </button>
        </div>

        <div className="mt-6 space-y-3 motion-stagger">
          <div
            className="motion-item flex items-start gap-3 rounded-lg border border-border/70 bg-card/50 p-4 transition hover:border-foreground/30"
            style={staggerStyle(1)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 text-foreground"
            >
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Email</p>
              <a
                href="mailto:chvcti@saude.ba.gov.br"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                chvcti@saude.ba.gov.br
              </a>
            </div>
          </div>

          <div
            className="motion-item flex items-start gap-3 rounded-lg border border-border/70 bg-card/50 p-4 transition hover:border-foreground/30"
            style={staggerStyle(2)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 text-foreground"
            >
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Telefone</p>
              <p className="text-sm text-muted-foreground">
                (77) 3229-2420
              </p>
            </div>
          </div>

          <div
            className="motion-item flex items-start gap-3 rounded-lg border border-border/70 bg-card/50 p-4 transition hover:border-foreground/30"
            style={staggerStyle(3)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 text-foreground"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Horário de Atendimento
              </p>
              <p className="text-sm text-muted-foreground">
                Segunda a Sexta, 9h às 18h
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!mounted) return null;

  return createPortal(modalMarkup, document.body);
}
