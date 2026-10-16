/**
 * Form fields used across the planner. Each has a visible label (with the unit in it),
 * optional help text and an inline error, all linked with aria-describedby. Numbers are
 * validated when the field loses focus or Enter is pressed, never while typing (docs/07).
 *
 * While the user types, the field shows a local draft; otherwise it shows the stored value,
 * so outside changes (undo, dragging on the map) appear straight away.
 */
import { useId, useState, type ReactNode } from 'react';
import { en } from '../../i18n/en.ts';
import { formatNumber } from '../../lib/format.ts';
import { Icon } from './Icon.tsx';

const NARROW_NBSP = String.fromCharCode(0x202f);
const NBSP = String.fromCharCode(0x00a0);
const MINUS = String.fromCharCode(0x2212);

/** Parses a typed number, accepting "1,234.5", "1 234.5" and a typographic minus. */
export function parseNumber(text: string): number | null {
  const clean = text
    .replaceAll(/[\s,]/g, '')
    .replaceAll(NARROW_NBSP, '')
    .replaceAll(NBSP, '')
    .replaceAll(MINUS, '-');
  if (clean === '' || !/^-?(\d+\.?\d*|\.\d+)$/.test(clean)) return null;
  return Number(clean);
}

export function validateNumber(
  text: string,
  label: string,
  min?: number,
  max?: number,
): string | null {
  const n = parseNumber(text);
  if (n === null) return en.planner.dialogs.number(label);
  if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
    return en.planner.dialogs.range(
      label,
      formatNumber(min ?? -Infinity),
      formatNumber(max ?? Infinity),
    );
  }
  return null;
}

/** "Width (m)" → "Width", for error messages. */
const bareLabel = (label: string): string => label.replace(/\s*\(.*\)$/, '');

function describedBy(id: string, help?: string, error?: string | null): string | undefined {
  return (
    [help ? `${id}-help` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined
  );
}

function Help({ id, text }: { id: string; text?: string | undefined }) {
  return text ? (
    <span id={`${id}-help`} className="field-help">
      {text}
    </span>
  ) : null;
}

function ErrorText({ id, text }: { id: string; text: string | null }) {
  return text ? (
    <span id={`${id}-err`} className="field-error">
      <Icon id="error" size={16} />
      {text}
    </span>
  ) : null;
}

export interface NumberFieldProps {
  /** Visible label, including the unit, e.g. "Width (m)". */
  label: string;
  value: number;
  /** Called with a valid number when the user commits a change. */
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Decimal places shown (default 2). */
  digits?: number;
  help?: string;
  disabled?: boolean;
  /** Hide the label visually (it stays the accessible name). Use only inside labelled tables. */
  labelHidden?: boolean;
  className?: string;
}

export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
  digits = 2,
  help,
  disabled,
  labelHidden,
  className,
}: NumberFieldProps) {
  const id = useId();
  const shown = formatNumber(value, digits).replace(/,/g, '');
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const text = draft ?? shown;

  const commit = () => {
    if (draft === null || draft === shown) {
      setDraft(null);
      setError(null);
      return;
    }
    const problem = validateNumber(draft, bareLabel(label), min, max);
    setError(problem);
    if (problem) return;
    setDraft(null);
    onCommit(parseNumber(draft) as number);
  };

  const stepBy = (direction: 1 | -1, big: boolean) => {
    const n = parseNumber(text) ?? value;
    const next = Math.min(
      max ?? Infinity,
      Math.max(min ?? -Infinity, n + direction * step * (big ? 10 : 1)),
    );
    setDraft(null);
    setError(null);
    onCommit(next);
  };

  return (
    <div className={className ? `field ${className}` : 'field'}>
      <label htmlFor={id} className={labelHidden ? 'visually-hidden' : undefined}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className="mono"
        value={text}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, help, error)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape' && draft !== null) {
            e.stopPropagation();
            setDraft(null);
            setError(null);
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            stepBy(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey);
          }
        }}
      />
      <Help id={id} text={help} />
      <ErrorText id={id} text={error} />
    </div>
  );
}

export interface TextFieldProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  maxLength?: number;
  required?: boolean;
  help?: string;
  multiline?: boolean;
  disabled?: boolean;
}

/** A text field that commits on blur or Enter. */
export function TextField({
  label,
  value,
  onCommit,
  maxLength,
  required,
  help,
  multiline,
  disabled,
}: TextFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const text = draft ?? value;

  const commit = () => {
    if (draft === null || draft === value) {
      setDraft(null);
      setError(null);
      return;
    }
    if (required && draft.trim() === '') {
      setError(en.planner.dialogs.required(label));
      return;
    }
    setError(null);
    setDraft(null);
    onCommit(draft);
  };

  const common = {
    id,
    value: text,
    maxLength,
    disabled,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy(id, help, error),
    onBlur: commit,
  };
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea {...common} rows={3} onChange={(e) => setDraft(e.target.value)} />
      ) : (
        <input
          {...common}
          type="text"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape' && draft !== null) {
              e.stopPropagation();
              setDraft(null);
              setError(null);
            }
          }}
        />
      )}
      <Help id={id} text={help} />
      <ErrorText id={id} text={error} />
    </div>
  );
}

export interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  help?: string;
  disabled?: boolean;
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  help,
  disabled,
}: SelectFieldProps<T>) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-describedby={describedBy(id, help)}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Help id={id} text={help} />
    </div>
  );
}

export interface CheckFieldProps {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  help?: string;
  disabled?: boolean;
}

export function CheckField({ label, checked, onChange, help, disabled }: CheckFieldProps) {
  const id = useId();
  return (
    <div className="field">
      <div className="check-row">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-describedby={describedBy(id, help)}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label htmlFor={id}>{label}</label>
      </div>
      <Help id={id} text={help} />
    </div>
  );
}
