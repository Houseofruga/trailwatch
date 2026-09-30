import styles from "./Card.module.css";

/**
 * White card. `title` + `action` make a title row; `flush` drops the body
 * padding (tables, timelines); use <CardSection> for divider-separated parts
 * and `footer` for the subdued strip.
 */
export function Card({
  title,
  titleId,
  action,
  flush,
  footer,
  children,
  className,
  id,
}: {
  title?: React.ReactNode;
  titleId?: string;
  action?: React.ReactNode;
  flush?: boolean;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`${styles.card} ${className ?? ""}`} aria-labelledby={title ? titleId : undefined} id={id}>
      {title ? (
        <div className={styles.titleRow}>
          <h2 className={styles.title} id={titleId}>
            {title}
          </h2>
          {action}
        </div>
      ) : null}
      {children !== undefined ? (
        <div className={flush ? (title ? styles.flushBody : undefined) : title ? styles.bodyAfterTitle : styles.body}>
          {children}
        </div>
      ) : null}
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </section>
  );
}

export function CardSection({ children }: { children: React.ReactNode }) {
  return <div className={styles.section}>{children}</div>;
}
