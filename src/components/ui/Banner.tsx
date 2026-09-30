import { IconAlert, IconCheckCircle, IconInfo, IconWarning, IconX } from "./icons";
import styles from "./Banner.module.css";

type Tone = "info" | "success" | "warning" | "critical";

const ICON = { info: IconInfo, success: IconCheckCircle, warning: IconWarning, critical: IconAlert };

export function Banner({
  tone,
  title,
  children,
  actions,
  onDismiss,
}: {
  tone: Tone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  onDismiss?: () => void;
}) {
  const Icon = ICON[tone];
  return (
    <div className={`${styles.banner} ${styles[tone]}`} role={tone === "critical" ? "alert" : undefined}>
      <span className={styles.icon}>
        <Icon size={18} />
      </span>
      <div className={styles.body}>
        {title ? <p className={styles.title}>{title}</p> : null}
        {children ? <div className={styles.text}>{children}</div> : null}
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {onDismiss ? (
        <button type="button" aria-label="Dismiss" className={styles.dismiss} onClick={onDismiss}>
          <IconX />
        </button>
      ) : null}
    </div>
  );
}
