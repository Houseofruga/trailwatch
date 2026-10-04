"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Feedback";
import { IconExternal } from "@/components/ui/icons";
import { count } from "@/features/appData/format";
import type { CategoryView } from "@/features/appData/types";
import styles from "./CategoriesCard.module.css";

const PREVIEW = 6;

/**
 * A store's shopping categories: the collections its own menu links to, with
 * product and on-sale counts (DESIGN 13-Categories). Listed, never alerted on.
 */
export function CategoriesCard({
  categories,
  storeName,
}: {
  /** Null while the first read is still running. */
  categories: CategoryView[] | null;
  storeName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card title="Categories" titleId="categories">
      {categories === null ? (
        <Spinner label="Reading categories…" />
      ) : categories.length === 0 ? (
        <p className={styles.empty}>We couldn&rsquo;t find categories on this store&rsquo;s menu.</p>
      ) : (
        <div className={styles.card}>
          <ul className={styles.list}>
            {(expanded ? categories : categories.slice(0, PREVIEW)).map((c) => (
              <li key={c.url} className={styles.row}>
                <a href={c.url} target="_blank" rel="noopener noreferrer" className={styles.main}>
                  <span className={styles.name}>{c.title}</span>
                  <span className={styles.meta}>
                    {`${count(c.products)} ${c.products === 1 ? "product" : "products"}`}
                    {c.onSale ? <Badge tone="attention">{`${count(c.onSale)} on sale`}</Badge> : null}
                  </span>
                </a>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${c.title} on ${storeName}`}
                  className={styles.open}
                >
                  <IconExternal size={15} />
                </a>
              </li>
            ))}
          </ul>
          {categories.length > PREVIEW ? (
            <div className={styles.more}>
              <Button variant="plain" onClick={() => setExpanded((e) => !e)}>
                {expanded ? "Show fewer" : `See all ${categories.length}`}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
