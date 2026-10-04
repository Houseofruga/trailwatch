"use client";

import { useEffect, useRef, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { IconCheck, IconMessage } from "@/components/ui/icons";
import { TextArea } from "@/components/ui/TextArea";
import styles from "./rate.module.css";

// The rating page (DESIGN 12-Beta 12e), opened from "Was this useful?" in emails.

type Claim = { u: string; k: "briefing" | "alert"; i: string; v: "useful" | "not_useful"; t: string };

const save = (claim: Claim, comment?: string) =>
  fetch("/api/rate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...claim, comment }) }).then((r) => r.ok);

export function RateForm({ claim }: { claim: Claim | null }) {
  const [state, setState] = useState<"saving" | "saved" | "error">("saving");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const started = useRef(false);

  // Saved from the browser, not when the server renders the page, so email
  // link scanners don't count as votes.
  useEffect(() => {
    if (!claim || started.current) return;
    started.current = true;
    save(claim).then((ok) => setState(ok ? "saved" : "error"));
  }, [claim]);

  if (!claim) {
    return (
      <section className={styles.card}>
        <h1 className={styles.title}>This link isn&rsquo;t valid</h1>
        <p className={styles.sub}>You can always reply to any TrailWatch email instead; it comes straight to the founder.</p>
        <div className={styles.linkRow}>
          <a href="/dashboard">Go to TrailWatch</a>
        </div>
      </section>
    );
  }

  const what = claim.k === "briefing" ? "briefing" : "alert";
  const useful = claim.v === "useful";
  const title = useful ? "Thanks, glad it helped" : "Thanks for telling us";
  return (
    <section className={styles.card}>
      <span className={styles.icon}>{useful ? <IconCheck size={20} /> : <IconMessage size={20} />}</span>
      {sent ? (
        <>
          <h1 className={styles.title}>{title}</h1>
          <Banner tone="success">Got it. The founder reads every note.</Banner>
        </>
      ) : (
        <>
          <div className={styles.heading}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.sub}>{useful ? `We’ll keep this ${what} coming.` : `We’ll use this to make the next ${what} more useful.`}</p>
          </div>
          {state === "error" ? <Banner tone="critical">We couldn&rsquo;t save that. Try the link again in a moment.</Banner> : null}
          <form
            className={styles.form}
            onSubmit={async (e) => {
              e.preventDefault();
              if (!comment.trim()) return;
              setSending(true);
              const ok = await save(claim, comment.trim());
              setSending(false);
              if (ok) setSent(true);
              else setState("error");
            }}
          >
            <TextArea
              id="rate-comment"
              label={useful ? "What was most useful? (optional)" : "What would have made it useful? (optional)"}
              rows={4}
              maxLength={2000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button variant="primary" type="submit" full tall loading={sending} disabled={!comment.trim()}>
              Send
            </Button>
          </form>
        </>
      )}
    </section>
  );
}
