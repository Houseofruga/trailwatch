"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { IconAlert, IconX } from "./icons";
import styles from "./Toast.module.css";

type ToastAction = { label: string; onClick: () => void };
type ToastOptions = { error?: boolean; action?: ToastAction };
type ToastMessage = { id: number; text: string } & ToastOptions;

const ToastContext = createContext<(text: string, opts?: ToastOptions) => void>(() => {});

/** `const toast = useToast(); toast("Settings saved")`, or with `{ action: { label: "Undo", onClick } }`. */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const show = useCallback((text: string, opts?: ToastOptions) => {
    setMessage({ id: Date.now(), text, ...opts });
  }, []);

  useEffect(() => {
    if (!message) return;
    // Errors and toasts with an action (Undo) stay longer.
    const t = setTimeout(() => setMessage(null), message.error || message.action ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* `ui`: rendered beside the app frame, so it needs the app's tokens and Inter itself. */}
      <div aria-live="polite" className={`ui ${styles.viewport}`}>
        {message ? (
          <Toast
            key={message.id}
            text={message.text}
            error={message.error}
            action={
              message.action
                ? {
                    label: message.action.label,
                    onClick: () => {
                      message.action!.onClick();
                      setMessage(null);
                    },
                  }
                : undefined
            }
            onDismiss={() => setMessage(null)}
          />
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function Toast({
  text,
  error,
  action,
  onDismiss,
}: {
  text: string;
  error?: boolean;
  action?: ToastAction;
  onDismiss?: () => void;
}) {
  return (
    <div className={`${styles.toast} ${error ? styles.error : ""}`} role="status">
      {error ? <IconAlert /> : null}
      <span className={styles.text}>{text}</span>
      {action ? (
        <button type="button" className={styles.action} onClick={action.onClick}>
          {action.label}
        </button>
      ) : onDismiss ? (
        <button type="button" aria-label="Dismiss" className={styles.dismiss} onClick={onDismiss}>
          <IconX size={14} />
        </button>
      ) : null}
    </div>
  );
}
