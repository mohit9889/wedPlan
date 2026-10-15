'use client';

import Modal from './Modal';

/**
 * Confirmation dialog for destructive actions.
 * @param {object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 * @param {function} props.onConfirm
 * @param {string} props.title
 * @param {string} props.message
 * @param {string} [props.confirmLabel='Confirm']
 * @param {boolean} [props.destructive=false]
 */
export default function ConfirmDialog({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', destructive = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="field-hint" style={{ marginBottom: 18, lineHeight: 1.6 }}>{message}</p>
      <div className="modal-actions">
        <button className="secondary-button" onClick={onClose}>Cancel</button>
        <button
          className="primary-button"
          style={destructive ? { background: '#b45309' } : undefined}
          onClick={() => { onConfirm(); onClose(); }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
