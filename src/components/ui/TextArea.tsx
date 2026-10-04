import styles from "./TextArea.module.css";

type Props = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
  id: string;
  label: string;
  /** Visually hidden label (the modal's message box). */
  hideLabel?: boolean;
  help?: string;
  minHeight?: number;
};

/** Multiline text field (NEW COMPONENT: Text area, DESIGN 12-Beta). Same border and focus as TextField. */
export function TextArea({ id, label, hideLabel, help, minHeight = 100, ...area }: Props) {
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={hideLabel ? styles.srOnly : styles.label}>
        {label}
      </label>
      <textarea id={id} className={styles.area} style={{ minHeight }} aria-describedby={helpId} {...area} />
      {help ? (
        <p id={helpId} className={styles.help}>
          {help}
        </p>
      ) : null}
    </div>
  );
}
