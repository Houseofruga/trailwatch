import { SpinnerIcon } from "./icons";
import styles from "./Badge.module.css";

export type BadgeTone = "neutral" | "info" | "success" | "attention" | "critical";

const SPIN: Record<BadgeTone, string> = {
  neutral: "#4a4740",
  info: "#1d4ed8",
  success: "#2f6b42",
  attention: "#7a5210",
  critical: "#b91c1c",
};

/** Status label. Always carries text; colour is never the only signal. */
export function Badge({
  tone = "neutral",
  spinner,
  children,
}: {
  tone?: BadgeTone;
  spinner?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={`${styles.badge} ${styles[tone]}`}>
      {spinner ? <SpinnerIcon size={12} tone={SPIN[tone]} /> : null}
      {children}
    </span>
  );
}
