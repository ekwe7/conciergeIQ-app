import type { ReactNode } from 'react';
import type { OrderStatus } from '../../lib/api-types';
import { cx } from './cx';

type Tone = 'pending' | 'progress' | 'done' | 'void' | 'neutral';

const dot: Record<Tone, string> = {
  pending: 'bg-status-pending',
  progress: 'bg-status-progress',
  done: 'bg-status-done',
  void: 'bg-status-void',
  neutral: 'bg-ink-3',
};

/** A small coloured dot followed by text; the text alone carries the meaning. */
export function StatusLabel({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-2', className)}>
      <span aria-hidden="true" className={cx('h-1.5 w-1.5 shrink-0 rounded-full', dot[tone])} />
      {children}
    </span>
  );
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export const ORDER_STATUS_TONE: Record<OrderStatus, Tone> = {
  PENDING: 'pending',
  IN_PROGRESS: 'progress',
  DELIVERED: 'done',
  CANCELLED: 'void',
};

export function OrderStatusLabel({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <StatusLabel tone={ORDER_STATUS_TONE[status]} className={className}>
      {ORDER_STATUS_LABEL[status]}
    </StatusLabel>
  );
}

/** A quiet bordered tag, e.g. "Unpaid" or a role. */
export function Tag({ children, emphasis = false, className }: { children: ReactNode; emphasis?: boolean; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded border px-1.5 py-px text-2xs font-medium',
        emphasis ? 'border-pending-line text-status-pending' : 'border-line-strong text-ink-2',
        className,
      )}
    >
      {children}
    </span>
  );
}
