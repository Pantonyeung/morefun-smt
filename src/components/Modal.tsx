import { useEffect, useId, useRef, type ReactNode } from 'react';

export function Modal({ title, subtitle, children, onClose, size = 'medium', footer }: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  size?: 'small' | 'medium' | 'large' | 'wide';
  footer?: ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', keydown);
    document.body.classList.add('modal-open');
    window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('button,input,textarea,select,[tabindex]:not([tabindex="-1"])')?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.classList.remove('modal-open');
      previous?.focus?.();
    };
  }, [onClose]);
  return <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panelRef} className={`modal-panel modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="modal-header">
        <div><h2 id={titleId}>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</div>
        <button className="icon-button" onClick={onClose} aria-label="關閉">×</button>
      </header>
      <div className="modal-content">{children}</div>
      {footer ? <footer className="modal-footer">{footer}</footer> : null}
    </section>
  </div>;
}

export function ConfirmDialog({ title, message, confirmLabel = '確認', danger = false, onConfirm, onClose }: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return <Modal title={title} onClose={onClose} size="small" footer={<><button className="button secondary" onClick={onClose}>取消</button><button className={`button ${danger ? 'danger' : 'primary'}`} onClick={onConfirm}>{confirmLabel}</button></>}>
    <p className="confirm-message">{message}</p>
  </Modal>;
}
