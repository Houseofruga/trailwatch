import { IconAlert } from "./icons";
import styles from "./TextField.module.css";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  id: string;
  label: React.ReactNode;
  help?: React.ReactNode;
  error?: React.ReactNode;
  /** Fixed text inside the field, before the value (e.g. "https://"). */
  prefix?: string;
  /** A control beside the field on the same row (e.g. an Add button). */
  trailing?: React.ReactNode;
};

export function TextField({ id, label, help, error, prefix, trailing, disabled, readOnly, className, ...input }: Props) {
  const describedBy = error ? `${id}-error` : help ? `${id}-help` : undefined;
  const box = (
    <div
      className={[
        styles.box,
        error ? styles.boxError : "",
        disabled || readOnly ? styles.boxSunken : "",
      ].join(" ")}
    >
      {prefix ? <span className={styles.prefix}>{prefix}</span> : null}
      <input
        id={id}
        className={`${styles.input} ${prefix ? styles.inputAfterPrefix : ""} ${disabled ? styles.inputDisabled : ""}`}
        disabled={disabled}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...input}
      />
    </div>
  );
  return (
    <div className={`${styles.field} ${className ?? ""}`}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      {trailing ? (
        <div className={styles.row}>
          {box}
          {trailing}
        </div>
      ) : (
        box
      )}
      {error ? (
        <p id={`${id}-error`} className={styles.error}>
          <span className={styles.errorIcon}>
            <IconAlert size={15} />
          </span>
          <span>{error}</span>
        </p>
      ) : help ? (
        <p id={`${id}-help`} className={styles.help}>
          {help}
        </p>
      ) : null}
    </div>
  );
}
