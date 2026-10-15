'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Modal component — renders as a bottom sheet on mobile, centered card on desktop.
 * @param {object} props
 * @param {boolean} props.open
 * @param {function} props.onClose
 * @param {string} props.title
 * @param {string} [props.eyebrow]
 * @param {React.ReactNode} props.children
 */
export default function Modal({ open, onClose, title, eyebrow, children }) {
  const backdropRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      ref={backdropRef}
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 id="modal-title">{title}</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
