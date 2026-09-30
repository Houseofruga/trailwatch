import styles from "./EmptyState.module.css";

type Art = "radar" | "store" | "filter" | "search";

// Small line illustrations from the canvas's component sheet.
function Illustration({ art }: { art: Art }) {
  return (
    <svg width="80" height="80" viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r="40" fill="#efede8" />
      {art === "radar" ? (
        <>
          <circle cx="48" cy="48" r="28" fill="none" stroke="#dcd8d0" strokeWidth="1.5" />
          <circle cx="48" cy="48" r="14" fill="none" stroke="#dcd8d0" strokeWidth="1.5" />
          <path d="M48 48 L72 30" stroke="#4a4740" strokeWidth="2" strokeLinecap="round" />
          <circle cx="48" cy="48" r="3" fill="#1a1a17" />
          <circle cx="66" cy="58" r="4" fill="#ffffff" stroke="#1a1a17" strokeWidth="1.5" />
        </>
      ) : art === "store" ? (
        <>
          <path d="M26 40h44v28H26z" fill="#ffffff" stroke="#4a4740" strokeWidth="1.8" />
          <path d="M24 40l5-12h38l5 12" fill="#efede8" stroke="#4a4740" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M42 68V54h12v14" fill="none" stroke="#4a4740" strokeWidth="1.8" />
        </>
      ) : art === "filter" ? (
        <path d="M28 32h40l-15 18v14l-10 5V50z" fill="#ffffff" stroke="#4a4740" strokeWidth="1.8" strokeLinejoin="round" />
      ) : (
        <>
          <circle cx="44" cy="44" r="14" fill="#ffffff" stroke="#4a4740" strokeWidth="1.8" />
          <path d="M54 54l12 12" stroke="#4a4740" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export function EmptyState({
  art,
  title,
  children,
  actions,
}: {
  art: Art;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className={styles.empty}>
      <Illustration art={art} />
      <h3 className={styles.title}>{title}</h3>
      {children ? <p className={styles.text}>{children}</p> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}
