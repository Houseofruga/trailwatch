"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { IconAlert, IconX } from "./icons";
import styles from "./Toast.module.css";

type ToastMessage = { id: number; text: string; error?: boolean };

const ToastContext = createContext<(text: string, opts?: { error?: boolean }) => void>(() => {});

/** `const toast = useToast(); toast("Settings saved")`. */
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<ToastMessage | null>(null);
  const show = useCallback((text: string, opts?: { error?: boolean }) => {
    setMessage({ id: Date.now(), text, error: opts?.error });
  }, []);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), message.error ? 6000 : 4000);
    return () => clearTimeout(t);
  }, [message]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className={styles.viewport}>
        {message ? <Toast text={message.text} error={message.error} onDismiss={() => setMessage(null)} /> : null}
      </div>
    </ToastContext.Provider>
  );
}

export function Toast({ text, error, onDismiss }: { text: string; error?: boolean; onDismiss?: () => void }) {
  return (
    <div className={`${styles.toast} ${error ? styles.error : ""}`} role="status">
      {error ? <IconAlert /> : null}
      <span>{text}</span>
      {onDismiss ? (
        <button type="button" aria-label="Dismiss" className={styles.dismiss} onClick={onDismiss}>
          <IconX size={14} />
        </button>
      ) : null}
    </div>
  );
}
