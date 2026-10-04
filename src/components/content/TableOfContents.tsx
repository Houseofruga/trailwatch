"use client";

import { useEffect, useState } from "react";
import { IconChevronDown } from "@/components/ui/icons";
import styles from "./content.module.css";

type Entry = { id: string; text: string };

/** The section nearest the top of the screen, for the highlighted entry. */
function useCurrentSection(entries: Entry[]): string {
  const [current, setCurrent] = useState(entries[0]?.id ?? "");
  useEffect(() => {
    const els = entries.flatMap((e) => document.getElementById(e.id) ?? []);
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      () => {
        // The last heading that has scrolled past the top third of the screen.
        const passed = els.filter((el) => el.getBoundingClientRect().top < window.innerHeight / 3);
        setCurrent((passed.at(-1) ?? els[0]).id);
      },
      { rootMargin: "0px 0px -66% 0px", threshold: [0, 1] },
    );
    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, [entries]);
  return current;
}

function List({ entries, current }: { entries: Entry[]; current: string }) {
  return (
    <ul className={styles.tocList}>
      {entries.map((e) => (
        <li key={e.id}>
          <a href={`#${e.id}`} aria-current={e.id === current ? "location" : undefined}>
            {e.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** "On this page": sticky in the right column on wide screens (DESIGN 14b). */
export function TableOfContents({ entries }: { entries: Entry[] }) {
  const current = useCurrentSection(entries);
  return (
    <aside className={styles.tocAside}>
      <nav aria-label="On this page" className={styles.toc}>
        <p className={styles.tocTitle}>On this page</p>
        <List entries={entries} current={current} />
      </nav>
    </aside>
  );
}

/** The same list as a collapsible card under the byline, on phones and narrow screens. */
export function TableOfContentsMobile({ entries }: { entries: Entry[] }) {
  const current = useCurrentSection(entries);
  return (
    <details className={`${styles.card} ${styles.tocMobile}`}>
      <summary>
        On this page
        <IconChevronDown />
      </summary>
      <nav aria-label="On this page" className={styles.tocMobileBody}>
        <List entries={entries} current={current} />
      </nav>
    </details>
  );
}
