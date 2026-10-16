/**
 * Native modal <dialog> (docs/07 "Dialogs"): the title is the accessible name, the first field
 * gets focus, Esc closes, and focus returns to whatever opened it.
 */
import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react';
import { en } from '../../i18n/en.ts';
import { Icon } from './Icon.tsx';

export interface DialogProps {
  title: string;
  /** Called when the dialog closes for any reason (Esc, close button, cancel). */
  onClose: () => void;
  /** If given, the body is a form and this runs on submit (Enter in a field, or the primary button). */
  onSubmit?: () => void;
  children: ReactNode;
  /** Footer buttons. A Cancel/Close button is added automatically. */
  actions?: ReactNode;
  wide?: boolean;
  /** Text for the automatic cancel button. */
  cancelLabel?: string;
  /** Short description linked with aria-describedby. */
  description?: string;
}

export function Dialog({ title, onClose, onSubmit, children, actions, wide, cancelLabel, description }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const opener = useRef<Element | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    opener.current = document.activeElement;
    if (!dialog.open) dialog.showModal();
    const first = dialog.querySelector<HTMLElement>(
      '[data-autofocus], .dialog-body input:not([type=hidden]):not([disabled]), .dialog-body select, .dialog-body textarea, .dialog-body button',
    );
    first?.focus();
    const handleClose = () => closeRef.current();
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('close', handleClose);
      if (dialog.open) dialog.close();
      const back = opener.current;
      if (back instanceof HTMLElement && back.isConnected) back.focus();
    };
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit?.();
  };

  const inner = (
    <>
      <div className="dialog-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="icon-btn" onClick={() => ref.current?.close()} aria-label={en.planner.dialogs.close}>
          <Icon id="close" size={18} />
        </button>
      </div>
      <div className="dialog-body">
        {description && <p id={descId}>{description}</p>}
        {children}
      </div>
      <div className="dialog-foot">
        <button type="button" className="btn" onClick={() => ref.current?.close()}>
          {cancelLabel ?? en.planner.dialogs.cancel}
        </button>
        {actions}
      </div>
    </>
  );

  return (
    <dialog
      ref={ref}
      className={wide ? 'pl-dialog wide' : 'pl-dialog'}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
    >
      {onSubmit ? (
        <form onSubmit={submit} noValidate>
          {inner}
        </form>
      ) : (
        <div className="dialog-inner">{inner}</div>
      )}
    </dialog>
  );
}
