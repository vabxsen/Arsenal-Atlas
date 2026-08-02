import { Plus, X } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Form primitives for the admin editor.
 *
 * Deliberately plain next to the rest of the design system: this is a working
 * surface, not a marketing one, and density matters more than motion. What it
 * does keep is the app's accessibility floor — every control has a real
 * `<label>`, a 44px target, and a visible focus ring, because an internal tool
 * being internal is not a reason to strand a keyboard user in it.
 */

const CONTROL =
  'w-full min-h-11 rounded-xl border border-line bg-base px-3 py-2 text-[0.9375rem] text-fg ' +
  'transition-colors placeholder:text-fg-tertiary hover:border-line-strong ' +
  'focus:border-line-glow focus:outline-none focus:ring-2 focus:ring-accent/40 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const ICON_BUTTON =
  'grid size-11 shrink-0 place-items-center rounded-xl border border-line text-fg-tertiary ' +
  'transition-colors hover:border-line-strong hover:text-fg focus:outline-none ' +
  'focus:ring-2 focus:ring-accent/40';

// ── Field wrapper ─────────────────────────────────────────────

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function Field({ label, hint, error, required, children }: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption font-medium text-fg">
        {label}
        {required ? (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children({ id, describedBy: describedBy || undefined, invalid: Boolean(error) })}
      {hint ? (
        <p id={hintId} className="text-[0.6875rem] text-fg-tertiary">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-[0.6875rem] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ── Scalar controls ───────────────────────────────────────────

interface TextProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  type?: 'text' | 'url';
}

export function TextInput({
  label,
  value,
  onChange,
  hint,
  error,
  required,
  placeholder,
  disabled,
  type = 'text',
}: TextProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          type={type}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(CONTROL, invalid && 'border-danger')}
        />
      )}
    </Field>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  hint,
  error,
  required,
  rows = 5,
  mono,
}: Omit<TextProps, 'type' | 'disabled' | 'placeholder'> & { rows?: number; mono?: boolean }) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          rows={rows}
          value={value}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            CONTROL,
            'resize-y leading-relaxed',
            mono && 'font-mono text-[0.8125rem]',
            invalid && 'border-danger'
          )}
        />
      )}
    </Field>
  );
}

export function NumberInput({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          type="number"
          value={value ?? ''}
          placeholder={placeholder}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          // An empty box means "no value", which is distinct from zero —
          // `serviceEnd: 0` would put a still-serving weapon out of service
          // in year zero.
          onChange={(event) =>
            onChange(event.target.value === '' ? undefined : Number(event.target.value))
          }
          className={cn(CONTROL, 'tnum', invalid && 'border-danger')}
        />
      )}
    </Field>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
  error,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          value={value}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value as T)}
          className={cn(CONTROL, 'cursor-pointer', invalid && 'border-danger')}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3 py-1">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-caption font-medium text-fg">
          {label}
        </label>
        {hint ? <p className="text-[0.6875rem] text-fg-tertiary">{hint}</p> : null}
      </div>
    </div>
  );
}

// ── String list ───────────────────────────────────────────────

/**
 * Aliases and facts: a flat list of strings. Entries are added with the button
 * or by pressing Enter, and an empty row is dropped rather than saved — a
 * blank alias would pollute the search index.
 */
export function StringList({
  label,
  values,
  onChange,
  hint,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  hint?: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState('');
  const id = useId();

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange([...values, trimmed]);
    setDraft('');
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption font-medium text-fg">
        {label}
      </label>

      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-2 pb-1">
          {values.map((value, index) => (
            <li
              key={`${value}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-base py-1 pl-3 pr-1 text-caption text-fg-secondary"
            >
              <span className="max-w-[28ch] truncate">{value}</span>
              <button
                type="button"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
                className="grid size-6 place-items-center rounded-full text-fg-tertiary transition-colors hover:bg-raised hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <span className="sr-only">Remove {value}</span>
                <X size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex gap-2">
        <input
          id={id}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter inside a form would submit it; this field adds a row.
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            }
          }}
          className={CONTROL}
        />
        <button type="button" onClick={commit} className={ICON_BUTTON}>
          <span className="sr-only">Add to {label}</span>
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>

      {hint ? <p className="text-[0.6875rem] text-fg-tertiary">{hint}</p> : null}
    </div>
  );
}

// ── Repeatable object rows ────────────────────────────────────

export interface RepeatColumn<T> {
  key: keyof T & string;
  label: string;
  type?: 'text' | 'url' | 'number';
  placeholder?: string;
  /** Tailwind grid-column span out of 12. Defaults to an even split. */
  span?: number;
}

/**
 * A table of small records — sources, countries, manufacturers.
 *
 * Rows are keyed by index rather than by content because the values are
 * exactly what is being edited: a content key would change on every keystroke
 * and remount the input, losing focus mid-word.
 */
export function RepeatList<T extends Record<string, unknown>>({
  label,
  hint,
  rows,
  columns,
  blank,
  onChange,
  error,
  addLabel = 'Add row',
}: {
  label: string;
  hint?: string;
  rows: T[];
  columns: RepeatColumn<T>[];
  blank: () => T;
  onChange: (rows: T[]) => void;
  error?: string;
  addLabel?: string;
}) {
  const update = (index: number, key: keyof T & string, raw: string, type: string | undefined) => {
    const value = type === 'number' ? (raw === '' ? undefined : Number(raw)) : raw;
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-caption font-medium text-fg">{label}</legend>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-3 py-4 text-caption text-fg-tertiary">
          None yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-12 gap-2">
                {columns.map((column) => (
                  <label
                    key={column.key}
                    className="flex flex-col gap-1"
                    style={{ gridColumn: `span ${column.span ?? Math.floor(12 / columns.length)}` }}
                  >
                    <span className="sr-only">{`${label} ${index + 1} ${column.label}`}</span>
                    <input
                      type={column.type === 'number' ? 'number' : 'text'}
                      value={(row[column.key] as string | number | undefined) ?? ''}
                      placeholder={column.placeholder ?? column.label}
                      onChange={(event) =>
                        update(index, column.key, event.target.value, column.type)
                      }
                      className={cn(CONTROL, column.type === 'number' && 'tnum')}
                    />
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => onChange(rows.filter((_, i) => i !== index))}
                className={ICON_BUTTON}
              >
                <span className="sr-only">{`Remove ${label} ${index + 1}`}</span>
                <X size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onChange([...rows, blank()])}
        className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-line px-4 text-caption text-fg-secondary transition-colors hover:border-line-strong hover:text-fg focus:outline-none focus:ring-2 focus:ring-accent/40"
      >
        <Plus size={14} aria-hidden="true" />
        {addLabel}
      </button>

      {hint ? <p className="text-[0.6875rem] text-fg-tertiary">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-[0.6875rem] text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

// ── JSON escape hatch ─────────────────────────────────────────

/**
 * Deeply nested structures — grouped specifications, galleries, timelines —
 * get a JSON panel rather than a bespoke nested form.
 *
 * That is a deliberate trade. These arrive fully formed from the seed pipeline
 * and are corrected far more often than they are authored, so the cost of
 * building four nested repeatable editors would buy very little. The text is
 * held as a string and only parsed on a successful `JSON.parse`, so a
 * half-typed edit never destroys the value underneath it.
 *
 * Because a failed parse leaves the last good value in place, the parent is
 * told about it through `onParseError` and blocks saving. Otherwise the button
 * would happily write a document that does not match what is on screen.
 */
export function JsonField<T>({
  label,
  value,
  onChange,
  onParseError,
  hint,
  rows = 10,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  onParseError: (error: string | null) => void;
  hint?: string;
  rows?: number;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  const handle = (next: string) => {
    setText(next);
    try {
      onChange(JSON.parse(next) as T);
      setParseError(null);
      onParseError(null);
    } catch (caught) {
      const message = (caught as Error).message;
      setParseError(message);
      onParseError(message);
    }
  };

  return (
    <TextArea
      label={label}
      value={text}
      onChange={handle}
      rows={rows}
      mono
      hint={hint}
      {...(parseError ? { error: parseError } : {})}
    />
  );
}
