import type { ReactNode } from 'react';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  error?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  busy = false,
  busyLabel = 'Working…',
  error,
  confirmVariant = 'danger',
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="sm">
      <p className="text-sm text-gray-700">{message}</p>
      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant={confirmVariant} disabled={busy} onClick={onConfirm}>
          {busy ? busyLabel : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmModal;