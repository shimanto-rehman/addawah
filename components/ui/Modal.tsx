'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  panelClassName?: string;
  labelledBy?: string;
  /** Skip the shared `.dawa-modal__panel` base styling (width/padding/bg/etc.)
   *  for consumers that need a fully custom, self-contained panel look. */
  unstyled?: boolean;
};

export function Modal({ open, onClose, children, panelClassName = '', labelledBy, unstyled = false }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="dawa-modal" role="presentation" onClick={onClose}>
      <div
        className={unstyled ? panelClassName : `dawa-modal__panel${panelClassName ? ` ${panelClassName}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
