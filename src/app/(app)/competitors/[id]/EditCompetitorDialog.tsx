"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { PageTypeSelect } from "@/components/PageTypeSelect";
import { updateCompetitorDetails, type EditFormState } from "@/features/competitors/actions";
import { canonUrl, toFullUrl, hostname, rowUrlError } from "@/features/competitors/rowRules";
import { type PageType } from "@/features/competitors/pageTypes";
import s from "@/app/(app)/competitors/add/CompetitorSetup.module.css";
import m from "./EditCompetitorDialog.module.css";

type InitialPage = { id: string; url: string; label: string; pageType: PageType };
type Row = { key: string; pageId: string; url: string; label: string; pageType: PageType };

function newRow(): Row {
  return { key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, pageId: "", url: "", label: "", pageType: "other" };
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={s.start} disabled={disabled || pending}>
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

/**
 * Edit competitor (IA "Add flows" §6) — the shared add edit view, pre-filled with
 * this competitor and its tracked pages, in a modal. Name + page rows (URL + type
 * + remove), "+ Add page" to the cap, soft cross-domain note, account-wide dup +
 * same-site validation; the last row can't be removed. Saves via
 * updateCompetitorDetails (which also deletes rows removed here).
 */
export function EditCompetitorDialog({
  competitorId,
  initialName,
  initialPages,
  otherUrls,
  pagesPerCompetitor,
  plan,
  onClose,
}: {
  competitorId: string;
  initialName: string;
  initialPages: InitialPage[];
  otherUrls: { url: string; competitor: string }[];
  pagesPerCompetitor: number;
  plan: "free" | "paid";
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [rows, setRows] = useState<Row[]>(
    initialPages.length > 0
      ? initialPages.map((p) => ({
          key: p.id,
          pageId: p.id,
          url: p.url.replace(/^https?:\/\//, ""),
          label: p.label,
          pageType: p.pageType,
        }))
      : [newRow()],
  );
  const [state, formAction] = useActionState<EditFormState, FormData>(updateCompetitorDetails, null);

  const dupOwner = new Map(otherUrls.map((e) => [canonUrl(e.url), e.competitor]));
  const row0Full = toFullUrl(rows[0]?.url ?? "");

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => (rs.length >= pagesPerCompetitor ? rs : [...rs, newRow()]));
  }
  function removeRow(key: string) {
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.key !== key)));
  }

  const rowErrors = rows.map((r) => rowUrlError(r.url, { row0Full, locked: false, dupOwner }));
  const filled = rows.filter((r) => r.url.trim());
  const errorCount = rowErrors.filter(Boolean).length;
  const canAddRow = rows.length < pagesPerCompetitor;
  const hosts = Array.from(new Set(filled.map((r) => hostname(r.url)).filter((h): h is string => Boolean(h))));
  const crossDomain = hosts.length > 1;
  const canSubmit = name.trim().length > 0 && filled.length > 0 && errorCount === 0;

  return (
    <div className={m.overlay} onClick={onClose}>
      <form action={formAction} className={m.card} onClick={(e) => e.stopPropagation()}>
        <input type="hidden" name="competitorId" value={competitorId} />
        <input type="hidden" name="name" value={name} />
        {rows.map((r) => (
          <span key={`h-${r.key}`} hidden>
            <input type="hidden" name="pageId" value={r.pageId} />
            <input type="hidden" name="url" value={toFullUrl(r.url)} />
            <input type="hidden" name="label" value={r.label.trim() || "Page"} />
            <input type="hidden" name="pageType" value={r.pageType} />
          </span>
        ))}

        <div className={m.header}>
          <div>
            <div className={m.title}>Edit competitor</div>
            <div className={m.sub}>Changes apply everywhere this competitor appears.</div>
          </div>
          <button type="button" className={m.close} onClick={onClose} aria-label="Close">
            &#10005;
          </button>
        </div>

        <div className={m.body}>
          <div className={s.field}>
            <span className={s.flabel}>Competitor name</span>
            <div className={s.fld}>
              <input className={s.textInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Retool" />
            </div>
          </div>

          <span className={s.flabel}>Pages</span>
          <div className={s.rows}>
            {rows.map((r, i) => {
              const err = rowErrors[i];
              const only = rows.length === 1;
              return (
                <div key={r.key}>
                  <div className={s.rowLine}>
                    <div className={err ? s.fldErr : s.fld} style={{ flex: 1 }}>
                      <input
                        className={s.urlInput}
                        value={r.url}
                        onChange={(e) => updateRow(r.key, { url: e.target.value })}
                        placeholder="Add a page URL"
                        inputMode="url"
                      />
                    </div>
                    <PageTypeSelect value={r.pageType} onChange={(t) => updateRow(r.key, { pageType: t })} />
                    {only ? (
                      <span className={s.removeDisabled} aria-hidden="true" title="Keep at least one page">
                        &#10005;
                      </span>
                    ) : (
                      <button type="button" className={s.remove} onClick={() => removeRow(r.key)} aria-label="Remove page">
                        &#10005;
                      </button>
                    )}
                  </div>
                  {err ? (
                    <div className={s.errNote}>
                      <span aria-hidden="true">&#9888;</span>
                      <span>{err}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {crossDomain ? (
            <div className={s.note}>
              <span aria-hidden="true">&#8505;</span>
              <span>
                These pages span {hosts.length} domains ({hosts.join(", ")}). That&rsquo;s allowed — just confirming it&rsquo;s
                intentional.
              </span>
            </div>
          ) : null}

          {plan === "free" && !canAddRow ? (
            <div className={s.freeNudge}>
              <span className={s.limitBadge} aria-hidden="true">&#8593;</span>
              <div className={s.freeNudgeText}>
                <div className={s.freeNudgeTitle}>Track more pages per competitor</div>
                <div className={s.sub}>
                  Free watches {pagesPerCompetitor} page{pagesPerCompetitor === 1 ? "" : "s"} per competitor. Pro adds more.
                </div>
              </div>
              <Link href="/billing" className={s.start}>Upgrade</Link>
            </div>
          ) : canAddRow ? (
            <div className={s.addRow}>
              <button type="button" className={s.secBtn} onClick={addRow}>
                <span className={s.plusSm} aria-hidden="true">+</span>Add page
              </button>
              <span className={s.sub}>
                {filled.length || rows.length} of {pagesPerCompetitor} used
              </span>
            </div>
          ) : (
            <div className={s.capNote}>
              {pagesPerCompetitor} of {pagesPerCompetitor} used — you can&rsquo;t add any more pages.
            </div>
          )}

          <div className={m.domainNote}>Domain is taken from the first page row.</div>

          {state?.error ? <div className={s.formError}>{state.error}</div> : null}
        </div>

        <div className={m.footer}>
          {errorCount > 0 ? (
            <span className={s.footErr}>Fix {errorCount} row{errorCount === 1 ? "" : "s"} to continue</span>
          ) : null}
          <button type="button" className={m.cancel} onClick={onClose}>
            Cancel
          </button>
          <SaveButton disabled={!canSubmit} />
        </div>
      </form>
    </div>
  );
}
