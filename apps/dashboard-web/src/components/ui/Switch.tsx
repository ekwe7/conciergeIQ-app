import { cx } from './cx';

/** An on/off control that announces its state, e.g. item availability. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name, e.g. "Jollof rice available". */
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-accent bg-accent-soft' : 'border-line-strong bg-sunken',
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'inline-block h-3.5 w-3.5 rounded-full shadow-sm transition-transform',
          checked ? 'translate-x-[18px] bg-accent' : 'translate-x-[2px] border border-line-strong bg-surface',
        )}
      />
    </button>
  );
}
