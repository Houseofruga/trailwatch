import { Button } from "./Button";
import { IconChevronLeft, SpinnerIcon } from "./icons";
import styles from "./IndexTable.module.css";

export type Column = { label: string; width?: number; align?: "left" | "right" };

export type Row = {
  id: string;
  cells: React.ReactNode[];
  /** The stacked version shown on phones (title line + meta line). */
  mobile: React.ReactNode;
  /** Expanded content under the row (a bundle's products). */
  detail?: React.ReactNode;
};

export type Pagination = { from: number; to: number; total: number; onPrevious?: () => void; onNext?: () => void };

/**
 * Filter bar + table (a stacked list on phones) + pagination. Loading keeps
 * the header and dims the rows under a spinner pill; `empty` and `error`
 * replace the rows.
 */
export function IndexTable({
  columns,
  rows,
  filters,
  loading,
  loadingLabel = "Loading…",
  empty,
  error,
  pagination,
}: {
  columns: Column[];
  rows: Row[];
  filters?: React.ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  empty?: React.ReactNode;
  error?: React.ReactNode;
  pagination?: Pagination;
}) {
  const showEmpty = !loading && !error && rows.length === 0 && empty;
  return (
    <div>
      {filters ? <div className={styles.filters}>{filters}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      <div className={styles.frame} aria-busy={loading || undefined}>
        {loading ? (
          <div className={styles.loadingPill}>
            <span>
              <SpinnerIcon tone="#4a4740" />
              {loadingLabel}
            </span>
          </div>
        ) : null}

        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.label}
                  scope="col"
                  style={{ width: c.width, textAlign: c.align ?? "left" }}
                  className={styles.th}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={loading ? styles.dimmed : undefined}>
            {showEmpty ? (
              <tr>
                <td colSpan={columns.length} className={styles.emptyCell}>
                  {empty}
                </td>
              </tr>
            ) : error ? null : (
              rows.map((r) => (
                <RowWithDetail key={r.id} row={r} columns={columns} />
              ))
            )}
          </tbody>
        </table>

        <ul className={`${styles.stacked} ${loading ? styles.dimmed : ""}`}>
          {showEmpty ? (
            <li className={styles.stackedEmpty}>{empty}</li>
          ) : error ? null : (
            rows.map((r) => (
              <li key={r.id} className={styles.stackedItem}>
                {r.mobile}
                {r.detail ? <div className={styles.stackedDetail}>{r.detail}</div> : null}
              </li>
            ))
          )}
        </ul>
      </div>

      {pagination && rows.length > 0 && !error ? (
        <nav aria-label="Pagination" className={styles.pagination}>
          <span className={styles.range}>
            {pagination.from}–{pagination.to} of {pagination.total}
          </span>
          <div className={styles.pageButtons}>
            <Button icon={<IconChevronLeft />} disabled={!pagination.onPrevious} onClick={pagination.onPrevious}>
              Previous
            </Button>
            <Button disabled={!pagination.onNext} onClick={pagination.onNext}>
              Next
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function RowWithDetail({ row, columns }: { row: Row; columns: Column[] }) {
  return (
    <>
      <tr className={styles.tr}>
        {row.cells.map((cell, i) => (
          <td key={i} className={styles.td} style={{ textAlign: columns[i]?.align ?? "left" }}>
            {cell}
          </td>
        ))}
      </tr>
      {row.detail ? (
        <tr className={styles.detailRow}>
          <td colSpan={columns.length} className={styles.detailCell}>
            {row.detail}
          </td>
        </tr>
      ) : null}
    </>
  );
}
