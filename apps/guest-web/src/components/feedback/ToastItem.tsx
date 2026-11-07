import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Info, CheckCircle2, AlertTriangle, XCircle, X, type LucideIcon } from 'lucide-react';
import { DEFAULT_TOAST_DURATION_MILLISECONDS, ToastNotification, ToastVariant } from './ToastContext';

export interface ToastItemProperties {
  notification: ToastNotification;
  onDismiss: (toastIdentifier: string) => void;
}

/** Horizontal drag distance beyond which releasing the toast dismisses it. */
export const SWIPE_DISMISS_THRESHOLD_PIXELS: number = 60;
/** Duration of the exit fade before the toast is removed from the stack. */
export const TOAST_EXIT_ANIMATION_MILLISECONDS: number = 200;

interface ToastVariantPresentation {
  IconComponent: LucideIcon;
  containerClasses: string;
  iconContainerClasses: string;
  progressBarClasses: string;
}

function resolveVariantPresentation(variant: ToastVariant): ToastVariantPresentation {
  switch (variant) {
    case 'success':
      return {
        IconComponent: CheckCircle2,
        containerClasses: 'border-emerald-200 bg-white text-emerald-950',
        iconContainerClasses: 'text-emerald-600 bg-emerald-50',
        progressBarClasses: 'bg-emerald-500',
      };
    case 'warning':
      return {
        IconComponent: AlertTriangle,
        containerClasses: 'border-amber-200 bg-white text-amber-950',
        iconContainerClasses: 'text-amber-600 bg-amber-50',
        progressBarClasses: 'bg-amber-500',
      };
    case 'danger':
      return {
        IconComponent: XCircle,
        containerClasses: 'border-rose-200 bg-white text-rose-950',
        iconContainerClasses: 'text-rose-600 bg-rose-50',
        progressBarClasses: 'bg-rose-500',
      };
    case 'info':
    default:
      return {
        IconComponent: Info,
        containerClasses: 'border-border bg-white text-text',
        iconContainerClasses: 'text-brand bg-brand-50',
        progressBarClasses: 'bg-brand',
      };
  }
}

/**
 * A single animated toast banner. Auto-dismisses after its duration (4 seconds by default),
 * pauses while hovered or focused, and can be swiped horizontally to dismiss.
 */
export const ToastItem: React.FC<ToastItemProperties> = ({ notification, onDismiss }) => {
  const durationMilliseconds: number =
    notification.durationMilliseconds ?? DEFAULT_TOAST_DURATION_MILLISECONDS;

  const [horizontalDragOffset, setHorizontalDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const dragStartHorizontalPositionReference = useRef<number | null>(null);
  const remainingMillisecondsReference = useRef<number>(durationMilliseconds);
  const timerStartedAtReference = useRef<number>(0);
  const autoDismissTimerReference = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimerReference = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beginExit = useCallback(() => {
    if (exitTimerReference.current !== null) {
      return;
    }
    setIsExiting(true);
    exitTimerReference.current = setTimeout(() => {
      onDismiss(notification.identifier);
    }, TOAST_EXIT_ANIMATION_MILLISECONDS);
  }, [notification.identifier, onDismiss]);

  // Run the auto-dismiss countdown whenever the toast is not paused or being dragged.
  useEffect(() => {
    if (isPaused || isDragging || isExiting) {
      return undefined;
    }
    timerStartedAtReference.current = Date.now();
    autoDismissTimerReference.current = setTimeout(beginExit, remainingMillisecondsReference.current);

    return () => {
      if (autoDismissTimerReference.current !== null) {
        clearTimeout(autoDismissTimerReference.current);
        autoDismissTimerReference.current = null;
      }
      const elapsedMilliseconds = Date.now() - timerStartedAtReference.current;
      remainingMillisecondsReference.current = Math.max(
        0,
        remainingMillisecondsReference.current - elapsedMilliseconds
      );
    };
  }, [isPaused, isDragging, isExiting, beginExit]);

  useEffect(() => {
    return () => {
      if (exitTimerReference.current !== null) {
        clearTimeout(exitTimerReference.current);
      }
    };
  }, []);

  const handlePointerDown = (pointerEvent: React.PointerEvent<HTMLDivElement>) => {
    if ((pointerEvent.target as HTMLElement).closest('button')) {
      return;
    }
    dragStartHorizontalPositionReference.current = pointerEvent.clientX;
    setIsDragging(true);
    pointerEvent.currentTarget.setPointerCapture?.(pointerEvent.pointerId);
  };

  const handlePointerMove = (pointerEvent: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartHorizontalPositionReference.current === null) {
      return;
    }
    setHorizontalDragOffset(pointerEvent.clientX - dragStartHorizontalPositionReference.current);
  };

  const finishDrag = (pointerEvent: React.PointerEvent<HTMLDivElement>, isCancelled: boolean) => {
    if (dragStartHorizontalPositionReference.current === null) {
      return;
    }
    const finalOffset = pointerEvent.clientX - dragStartHorizontalPositionReference.current;
    dragStartHorizontalPositionReference.current = null;
    setIsDragging(false);

    if (!isCancelled && Math.abs(finalOffset) > SWIPE_DISMISS_THRESHOLD_PIXELS) {
      setHorizontalDragOffset(finalOffset > 0 ? window.innerWidth : -window.innerWidth);
      beginExit();
    } else {
      setHorizontalDragOffset(0);
    }
  };

  const { IconComponent, containerClasses, iconContainerClasses, progressBarClasses } =
    resolveVariantPresentation(notification.variant);

  const dragOpacity = 1 - Math.min(Math.abs(horizontalDragOffset) / (SWIPE_DISMISS_THRESHOLD_PIXELS * 3), 0.7);

  return (
    <div
      data-testid={`toast-item-${notification.identifier}`}
      data-toast-variant={notification.variant}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(pointerEvent) => finishDrag(pointerEvent, false)}
      onPointerCancel={(pointerEvent) => finishDrag(pointerEvent, true)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      style={{
        transform: `translateX(${horizontalDragOffset}px)`,
        opacity: isExiting ? 0 : dragOpacity,
        transition: isDragging ? 'none' : 'transform 200ms ease-out, opacity 200ms ease-out',
        touchAction: 'pan-y',
      }}
      className={`toast-enter pointer-events-auto relative w-full overflow-hidden rounded-2xl border shadow-elevation-mid select-none p-3.5 flex items-start gap-3 ${containerClasses}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconContainerClasses}`}>
        <IconComponent className="w-5 h-5" aria-hidden="true" />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <p className="text-xs font-bold leading-tight">{notification.title}</p>
        <p className="text-xs text-text-muted mt-0.5 leading-snug line-clamp-2">{notification.message}</p>
        {notification.action && (
          <button
            type="button"
            onClick={() => {
              notification.action?.onClick();
              beginExit();
            }}
            className="mt-2 inline-flex items-center text-xs font-bold text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded"
          >
            {notification.action.label} <span aria-hidden="true">&nbsp;→</span>
          </button>
        )}
      </div>

      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={beginExit}
        className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-muted shrink-0 -mr-1 -mt-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>

      <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-1 bg-surface-muted overflow-hidden">
        <div
          data-testid="toast-countdown-bar"
          className={`toast-countdown h-full w-full origin-left ${progressBarClasses}`}
          style={{
            animationDuration: `${durationMilliseconds}ms`,
            animationPlayState: isPaused || isDragging ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
};
