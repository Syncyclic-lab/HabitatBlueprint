/**
 * Form fields used across the planner. Each has a visible label (with the unit in it),
 * optional help text and an inline error, all linked with aria-describedby. Numbers are
 * validated when the field loses focus or Enter is pressed, never while typing (docs/07).
 */
import { useEffect, useId, useState, type ReactNode } from 'react';
import { en } from '../../i18n/en.ts';
import { formatNumber } from '../../lib/format.ts';
import { Icon } from './Icon.tsx';

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

/** Parses a typed number, accepting "1,234.5" and "1 234.5". */
export function parseNumber(text: string): number | null {
  const clean = text.replace(/[\s, ]/g, '').replace('−', '-');
  if (clean === '' || !/^-?(\d+\.?\d*|\.\d+)$/.test(clean)) return null;
  return Number(clean);
}

export function validateNumber(text: string, label: string, min?: number, max?: number): string | null {
  const n = parseNumber(text);
  if (n === null) return en.planner.dialogs.number(label);
  if ((min !== undefined && n < min) || (max !== undefined && n > max)) {
    return en.planner.dialogs.range(label, formatNumber(min ?? -Infinity), formatNumber(max ?? Infinity));
  }
  return null;
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
  const [text, setText] = useState(shown);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  // Follow outside changes (undo, dragging on the map) unless the user is typing.
  useEffect(() => {
    if (!editing) {
      setText(shown);
      setError(null);
    }
  }, [shown, editing]);

  const commit = () => {
    setEditing(false);
    if (text === shown) return;
    const problem = validateNumber(text, label.replace(/\s*\(.*\)$/, ''), min, max);
    setError(problem);
    if (problem) return;
    onCommit(parseNumber(text) as number);
  };

  const describedBy = [help ? `${id}-help` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
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
        aria-describedby={describedBy}
        onFocus={() => setEditing(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
            setEditing(true);
          } else if (e.key === 'Escape' && text !== shown) {
            e.stopPropagation();
            setText(shown);
            setError(null);
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            const n = parseNumber(text) ?? value;
            const delta = (e.key === 'ArrowUp' ? 1 : -1) * step * (e.shiftKey ? 10 : 1);
            const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n + delta));
            setText(formatNumber(next, digits).replace(/,/g, ''));
            setError(null);
            onCommit(next);
          }
        }}
      />
      {help && (
        <span id={`${id}-help`} className="field-help">
          {help}
        </span>
      )}
      {error && (
        <span id={`${id}-err`} className="field-error">
          <Icon id="error" size={16} />
          {error}
        </span>
      )}
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
export function TextField({ label, value, onCommit, maxLength, required, help, multiline, disabled }: TextFieldProps) {
  const id = useId();
  const [text, setText] = useState(value);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) setText(value);
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    if (text === value) return;
    if (required && text.trim() === '') {
      setError(en.planner.dialogs.required(label));
      return;
    }
    setError(null);
    onCommit(text);
  };

  const describedBy = [help ? `${id}-help` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  const common = {
    id,
    value: text,
    maxLength,
    disabled,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    onFocus: () => setEditing(true),
    onBlur: commit,
  };
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea {...common} rows={3} onChange={(e) => setText(e.target.value)} />
      ) : (
        <input
          {...common}
          type="text"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
              setEditing(true);
            }
          }}
        />
      )}
      {help && (
        <span id={`${id}-help`} className="field-help">
          {help}
        </span>
      )}
      {error && (
        <span id={`${id}-err`} className="field-error">
          <Icon id="error" size={16} />
          {error}
        </span>
      )}
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

export function SelectField<T extends string>({ label, value, options, onChange, help, disabled }: SelectFieldProps<T>) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        aria-describedby={help ? `${id}-help` : undefined}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help && (
        <span id={`${id}-help`} className="field-help">
          {help}
        </span>
      )}
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
          aria-describedby={help ? `${id}-help` : undefined}
          onChange={(e) => onChange(e.target.checked)}
        />
        <label htmlFor={id}>{label}</label>
      </div>
      {help && (
        <span id={`${id}-help`} className="field-help">
          {help}
        </span>
      )}
    </div>
  );
}
