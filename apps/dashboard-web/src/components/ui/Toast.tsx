import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from './cx';

interface Toast {
  id: number;
  message: string;
  tone: 'default' | 'error';
}

interface ToastApi {
  show(message: string): void;
  error(message: string): void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Brief confirmations ("Order A-1042 accepted") announced to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const push = useCallback(
    (message: string, tone: Toast['tone']) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({ show: (message) => push(message, 'default'), error: (message) => push(message, 'error') }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={cx(
              'pointer-events-auto flex items-start gap-3 rounded-md px-3.5 py-2.5 text-[13px] shadow-overlay',
              toast.tone === 'error' ? 'border border-danger-line bg-danger-soft text-danger' : 'bg-ink text-white',
            )}
          >
            <p className="flex-1">{toast.message}</p>
            <button type="button" aria-label="Dismiss" onClick={() => dismiss(toast.id)} className="opacity-70 hover:opacity-100">
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast must be used inside ToastProvider');
  return api;
}
