import { Button } from "./Button";
import { IconAlert } from "./icons";
import styles from "./SaveBar.module.css";

/** Replaces the top bar while a form has unsaved changes (07-Settings / save bar). */
export function SaveBar({ onSave, onDiscard, saving }: { onSave: () => void; onDiscard: () => void; saving?: boolean }) {
  return (
    <div className={styles.bar} role="region" aria-label="Unsaved changes">
      <div className={styles.left}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-light.svg" alt="TrailWatch" width={90} height={20} className={styles.logo} />
        <span className={styles.message}>
          <IconAlert /> Unsaved changes
        </span>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.discard} onClick={onDiscard} disabled={saving}>
          Discard
        </button>
        <Button className={styles.save} loading={saving} onClick={onSave}>
          Save
        </Button>
      </div>
    </div>
  );
}
