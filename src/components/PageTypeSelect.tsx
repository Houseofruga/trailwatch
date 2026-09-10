"use client";

import { PAGE_TYPE_VALUES, pageTypeLabel, type PageType } from "@/features/competitors/pageTypes";
import styles from "./PageTypeSelect.module.css";

/**
 * The per-row page-type control in the Add/Edit competitor edit view — a compact
 * dropdown styled as a `.fld` box with a chevron (design "Add flows" §4). A native
 * <select> keeps it accessible and lets it post its value inside the form
 * (`name="pageType"`, read by readPageRows via getAll).
 */
export function PageTypeSelect({
  value,
  onChange,
  name = "pageType",
  disabled = false,
}: {
  value: PageType;
  onChange: (t: PageType) => void;
  name?: string;
  disabled?: boolean;
}) {
  return (
    <div className={styles.wrap}>
      <select
        className={styles.select}
        name={name}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as PageType)}
        aria-label="Page type"
      >
        {PAGE_TYPE_VALUES.map((t) => (
          <option key={t} value={t}>
            {pageTypeLabel(t)}
          </option>
        ))}
      </select>
      <svg className={styles.chev} width="9" height="6" viewBox="0 0 9 6" fill="none" aria-hidden="true">
        <path d="M1 1l3.5 3.5L8 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
