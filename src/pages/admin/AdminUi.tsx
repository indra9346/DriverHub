import React, { useEffect, useId, useRef, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import { useLanguage } from '../../services/i18n';

/** Database account status -> what the admin UI shows ('suspended' is shown as blocked). */
export function normaliseAccountStatus(status: string | undefined | null): 'active' | 'pending' | 'blocked' {
  if (status === 'blocked' || status === 'suspended') return 'blocked';
  if (status === 'pending') return 'pending';
  return 'active';
}

// Only the top-most open modal reacts to Escape.
const escapeStack: number[] = [];
let nextModalId = 1;

function useEscapeToClose(onClose: () => void, open: boolean) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const id = nextModalId++;
    escapeStack.push(id);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || escapeStack[escapeStack.length - 1] !== id) return;
      event.stopPropagation();
      closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const index = escapeStack.indexOf(id);
      if (index >= 0) escapeStack.splice(index, 1);
    };
  }, [open]);
}

type AdminModalProps = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Stacking: inspect dialogs use z-[60], confirmations opened from them z-[70]. */
  layer?: 'base' | 'top';
  /** Disable Escape/backdrop close while a save is running. */
  locked?: boolean;
};

/** Scrollable dialog that closes on Escape, backdrop click and the X button. */
export const AdminModal: React.FC<AdminModalProps> = ({
  open, onClose, title, eyebrow, subtitle, children, footer, layer = 'base', locked = false
}) => {
  const { t } = useLanguage();
  const titleId = useId();
  const requestClose = () => { if (!locked) onClose(); };
  useEscapeToClose(requestClose, open);
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 ${layer === 'top' ? 'z-[70]' : 'z-[60]'} flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4`}
      onMouseDown={(event) => { if (event.target === event.currentTarget) requestClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-8 animate-in fade-in zoom-in-95"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && <span className="text-xs font-bold uppercase text-slate-400">{eyebrow}</span>}
            <h3 id={titleId} className="mt-0.5 break-words text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="break-words text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={locked}
            aria-label={t('close')}
            className="-mr-2 -mt-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-4">{children}</div>
        {footer && (
          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

type ConfirmDialogProps = {
  open: boolean;
  title: React.ReactNode;
  body?: React.ReactNode;
  confirmLabel: string;
  busy?: boolean;
  error?: string;
  layer?: 'base' | 'top';
  reason?: {
    label: string;
    placeholder?: string;
    help?: string;
    required?: boolean;
    requiredMessage?: string;
  };
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

/** Destructive-action confirmation with an optional (or required) reason. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, title, body, confirmLabel, busy = false, error, layer = 'top', reason, onConfirm, onCancel
}) => {
  const { t } = useLanguage();
  const reasonId = useId();
  const [text, setText] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setText('');
      setTouched(false);
    }
  }, [open]);

  const missingReason = Boolean(reason?.required) && text.trim().length === 0;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (missingReason || busy) return;
    onConfirm(text.trim());
  };

  return (
    <AdminModal open={open} onClose={onCancel} title={title} layer={layer} locked={busy}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {body && <div className="break-words text-sm text-slate-600">{body}</div>}
        {reason && (
          <div className="space-y-1.5">
            <label htmlFor={reasonId} className="block text-xs font-semibold text-slate-800">
              {reason.label}{reason.required ? ' *' : ''}
            </label>
            <textarea
              id={reasonId}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onBlur={() => setTouched(true)}
              rows={3}
              maxLength={500}
              autoFocus={Boolean(reason.required)}
              required={reason.required}
              aria-invalid={touched && missingReason}
              placeholder={reason.placeholder}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-amber sm:text-sm"
            />
            {reason.help && <p className="text-[11px] text-slate-500">{reason.help}</p>}
            {touched && missingReason && (
              <p role="alert" className="text-xs font-semibold text-red-700">{reason.requiredMessage || reason.label}</p>
            )}
          </div>
        )}
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-10 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60 cursor-pointer"
          >
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} {confirmLabel}
          </button>
        </div>
      </form>
    </AdminModal>
  );
};
