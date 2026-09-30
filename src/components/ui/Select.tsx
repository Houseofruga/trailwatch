import { IconChevronDown } from "./icons";
import styles from "./Select.module.css";

export type Option = { value: string; label: string };

/**
 * Inline filter pill ("Priority: High"). A native <select> sits invisibly on
 * top, so keyboard, screen readers and mobile pickers work as usual. It reads
 * as active (sunken) when the value isn't the first option.
 */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
}) {
  const current = options.find((o) => o.value === value) ?? options[0];
  const active = value !== options[0]?.value;
  return (
    <span className={`${styles.pill} ${active ? styles.pillActive : ""}`}>
      <span className={styles.pillLabel}>{label}:</span>
      <span className={styles.pillValue}>{current?.label}</span>
      <IconChevronDown size={14} />
      <select
        className={styles.native}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </span>
  );
}

/** Form select with a label above it. */
export function FormSelect({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  name,
}: {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.selectWrap}>
        <select
          id={id}
          name={name}
          className={styles.select}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className={styles.chevron}>
          <IconChevronDown />
        </span>
      </div>
    </div>
  );
}
