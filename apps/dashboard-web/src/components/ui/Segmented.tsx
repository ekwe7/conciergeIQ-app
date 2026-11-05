import { cx } from './cx';

interface Option<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** A row of mutually exclusive filters, e.g. floors or periods. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Option<T>[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded border border-line bg-sunken p-0.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cx(
              'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-3 text-[13px] transition-colors',
              selected ? 'bg-surface font-medium text-ink shadow-sm' : 'text-ink-3 hover:text-ink',
            )}
          >
            {option.label}
            {option.count !== undefined && <span className="tabular text-ink-3">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
