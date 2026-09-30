import styles from "./Timeline.module.css";

/** Day-grouped list of moves (06-Competitor detail). */
export function TimelineDay({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <>
      <h3 className={styles.day}>{heading}</h3>
      <ul className={styles.list}>{children}</ul>
    </>
  );
}

export function TimelineItem({
  id,
  icon,
  title,
  meta,
  eyebrow,
  highlighted,
  children,
}: {
  id?: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  /** Right side of the title row: priority badge + time. */
  meta: React.ReactNode;
  eyebrow?: string;
  highlighted?: boolean;
  /** "What it means" / "Compared with yours" lines. */
  children?: React.ReactNode;
}) {
  return (
    <li id={id} className={`${styles.item} ${highlighted ? styles.highlighted : ""}`}>
      <span className={styles.icon}>{icon}</span>
      <div className={styles.body}>
        {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        <div className={styles.titleRow}>
          <span className={styles.title}>{title}</span>
          <div className={styles.meta}>{meta}</div>
        </div>
        {children}
      </div>
    </li>
  );
}

export function TimelineNote({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className={styles.note}>
      {icon ? <span className={styles.noteIcon}>{icon}</span> : null}
      <span>
        <strong>{label}: </strong>
        {children}
      </span>
    </p>
  );
}
