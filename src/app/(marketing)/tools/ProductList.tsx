import { Badge } from "@/components/ui/Badge";
import { Thumbnail } from "@/components/ui/Avatar";
import { money, shortDate } from "@/features/appData/format";
import type { ReportItem } from "@/features/catalog/firstReport";
import styles from "./tools.module.css";

/** Products from a store's public catalog, each linking to its page on the store. */
export function ProductList({ host, items, show }: { host: string; items: ReportItem[]; show: "launched" | "discount" }) {
  return (
    <ul className={styles.products}>
      {items.map((p) => (
        <li key={p.id}>
          <a className={styles.productRow} href={`https://${host}/products/${p.handle}`} target="_blank" rel="noopener noreferrer">
            <Thumbnail src={p.image} />
            <span className={styles.productText}>
              <span className={styles.productTitle}>{p.title}</span>
              <span className={styles.productMeta}>
                {money(p.price)}
                {show === "discount" && p.compareAtPrice ? <span className={styles.was}>{money(p.compareAtPrice)}</span> : null}
                {show === "launched" && p.launchedAt ? ` · added ${shortDate(p.launchedAt)}` : null}
              </span>
            </span>
            {show === "discount" && p.pctOff ? <Badge tone="attention">{`${p.pctOff}% off`}</Badge> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
