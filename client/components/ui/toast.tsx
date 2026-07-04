"use client";

/**
 * Tiny lightweight toast system. Single-instance — `pushToast()` queues a
 * toast and `useToasts()` returns the current list. The provider mounts at
 * the page level; toasts auto-dismiss after a duration.
 *
 * Kept tiny (no shadcn toast) so we don't pull in a new Radix module just
 * for "Bed counts updated" messages.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { IconCheck, IconInfoCircle, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "info" | "error";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** Auto-dismiss after this many ms. Set 0 to keep open. */
  durationMs: number;
}

interface ToastContextValue {
  pushToast: (t: Omit<Toast, "id" | "durationMs"> & { durationMs?: number }) => void;
  toasts: Toast[];
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToasts(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toasts: [],
      pushToast: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback<ToastContextValue["pushToast"]>((t) => {
    idRef.current += 1;
    const id = `toast-${idRef.current}`;
    const next: Toast = {
      id,
      title: t.title,
      description: t.description,
      variant: t.variant,
      durationMs: t.durationMs ?? 4000,
    };
    setToasts((list) => [...list, next]);
  }, []);

  const value = useMemo(
    () => ({ pushToast, toasts, dismiss }),
    [pushToast, toasts, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

function ToastViewport() {
  const { toasts, dismiss } = useToasts();
  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (toast.durationMs <= 0) return;
    const id = setTimeout(onDismiss, toast.durationMs);
    return () => clearTimeout(id);
  }, [toast.durationMs, onDismiss]);

  return (
    <div
      role="status"
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg border bg-card p-3 shadow-lg ring-1 ring-foreground/5",
        "animate-in slide-in-from-bottom-2 fade-in duration-200",
        toast.variant === "success" && "border-emerald-500/30",
        toast.variant === "error" && "border-destructive/30",
        toast.variant === "info" && "border-niramoy-teal/30",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white",
          toast.variant === "success" && "bg-emerald-500",
          toast.variant === "error" && "bg-destructive",
          toast.variant === "info" && "bg-niramoy-teal",
        )}
        aria-hidden
      >
        {toast.variant === "success" ? (
          <IconCheck className="size-3" />
        ) : (
          <IconInfoCircle className="size-3" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-foreground">{toast.title}</div>
        {toast.description && (
          <div className="text-[11px] text-muted-foreground">
            {toast.description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Dismiss"
      >
        <IconX className="size-3.5" />
      </button>
    </div>
  );
}
