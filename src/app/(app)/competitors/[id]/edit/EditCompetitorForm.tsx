"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Button } from "@/components/Button";
import type { CompetitorRow } from "@/features/competitors/queries";
import { updateCompetitorDetails, type EditFormState } from "@/features/competitors/actions";
import { normalizeDomainInput, originOf } from "@/features/competitors/domain";
import styles from "./page.module.css";

function SubmitButton({ canSubmit }: { canSubmit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !canSubmit}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

// Strips a page's own current origin off its URL, leaving path + query +
// hash intact — this is what's shown/edited under the domain field above,
// regardless of whether the page happens to already match that domain.
function pathOf(url: string): string {
  const origin = originOf(url);
  return origin && url.startsWith(origin) ? url.slice(origin.length) : url;
}

export function EditCompetitorForm({ competitor }: { competitor: CompetitorRow }) {
  const [state, formAction] = useActionState<EditFormState, FormData>(updateCompetitorDetails, null);
  const [name, setName] = useState(competitor.name);
  const [domain, setDomain] = useState(
    (originOf(competitor.pages[0]?.url ?? "") ?? "").replace(/^https?:\/\//, ""),
  );
  const [paths, setPaths] = useState(() =>
    competitor.pages.map((p) => ({ id: p.id, label: p.label, path: pathOf(p.url) })),
  );

  const normalizedOrigin = normalizeDomainInput(domain);
  const canSubmit = name.trim().length > 0 && normalizedOrigin !== null;

  function updatePath(id: string, value: string) {
    setPaths((rows) => rows.map((r) => (r.id === id ? { ...r, path: value } : r)));
  }

  return (
    <div className={styles.wrap}>
      <Link href="/competitors" className={styles.back}>
        ← Competitors
      </Link>
      <h1 className={styles.title}>Edit {competitor.name}</h1>

      <form action={formAction}>
        <input type="hidden" name="competitorId" value={competitor.id} />

        <label className={styles.fieldLabel} htmlFor="edit-name">
          Name
        </label>
        <input
          id="edit-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={styles.nameInput}
        />

        <label className={styles.fieldLabel} htmlFor="edit-domain">
          Domain
        </label>
        <input
          id="edit-domain"
          name="domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className={styles.domainInput}
        />
        <p className={styles.domainHint}>
          Every page below moves under this domain when you save — only the domain changes, each
          page keeps its own path.
        </p>

        <div className={styles.pagesHead}>Pages</div>
        <div className={styles.pageRows}>
          {paths.map((row) => (
            <div key={row.id} className={styles.pageRow}>
              <div className={styles.pageLabel}>{row.label}</div>
              <div className={styles.urlLocked}>
                <span className={styles.urlLockedPrefix}>{normalizedOrigin ?? (domain || "https://…")}</span>
                <input
                  value={row.path}
                  onChange={(e) => updatePath(row.id, e.target.value)}
                  placeholder="/pricing"
                  className={styles.urlLockedPath}
                />
              </div>
              <input type="hidden" name="pageId" value={row.id} />
              <input type="hidden" name="pagePath" value={row.path} />
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          <SubmitButton canSubmit={canSubmit} />
          <Link href="/competitors" className={styles.cancel}>
            Cancel
          </Link>
          {state?.error ? <span className={styles.formError}>{state.error}</span> : null}
        </div>
      </form>
    </div>
  );
}
