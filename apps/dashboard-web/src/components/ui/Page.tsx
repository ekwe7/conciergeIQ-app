import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { cx } from './cx';

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx('rounded-lg border border-line bg-surface', className)}>{children}</section>;
}

export function PanelHeader({ title, actions, description }: { title: string; actions?: ReactNode; description?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {description && <p className="text-xs text-ink-3">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

/** A labelled figure, e.g. "Occupancy 65%". */
export function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3.5">
      <p className="text-[13px] text-ink-3">{label}</p>
      <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-ink-3">{detail}</p>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[13px] text-ink-3">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <AlertCircle className="h-5 w-5 text-danger" strokeWidth={1.75} aria-hidden="true" />
      <p className="mt-2 text-sm font-medium text-ink">Could not load this</p>
      <p className="mt-1 max-w-sm text-[13px] text-ink-3">{message}</p>
      {onRetry && (
        <Button size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Grey placeholder rows while data loads. */
export function LoadingRows({ rows = 4, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-2 p-4">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-10 animate-pulse rounded bg-sunken" />
      ))}
    </div>
  );
}

/** Styling shared by every data table. */
export const table = {
  wrap: 'overflow-x-auto',
  table: 'w-full border-collapse text-left text-sm',
  th: 'whitespace-nowrap border-b border-line px-4 py-2.5 text-xs font-medium text-ink-3',
  body: 'divide-y divide-line',
  td: 'px-4 py-3 align-middle text-[13px] text-ink-2',
  row: 'hover:bg-canvas',
};
