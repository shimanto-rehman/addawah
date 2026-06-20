'use client';

import { useRef } from 'react';
import { Modal } from '@/components/ui/Modal';

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal open={open} onClose={onCancel} labelledBy="dawa-modal-title">
      <h2 id="dawa-modal-title" className="dawa-modal__title">{title}</h2>
      <p className="dawa-modal__message">{message}</p>
      <div className="dawa-modal__actions">
        <button
          ref={cancelRef}
          type="button"
          className="dawa-btn dawa-btn--outline"
          disabled={busy}
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`dawa-btn${tone === 'danger' ? ' dawa-btn--danger' : ' dawa-btn--primary'}`}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
