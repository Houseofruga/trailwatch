"use client";

import { useEffect, useRef, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { AuthCard, AuthHeading } from "@/features/auth/AuthShell";
import styles from "./rate.module.css";

type Claim = { u: string; k: "briefing" | "alert"; i: string; v: "useful" | "not_useful"; t: string };

const save = (claim: Claim, comment?: string) =>
  fetch("/api/rate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...claim, comment }) }).then((r) => r.ok);

export function RateForm({ claim }: { claim: Claim | null }) {
  const [state, setState] = useState<"saving" | "saved" | "error">("saving");
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const started = useRef(false);

  // Saved from the browser, not on page load at the server, so email
  // link scanners don't count as votes.
  useEffect(() => {
    if (!claim || started.current) return;
    started.current = true;
    save(claim).then((ok) => setState(ok ? "saved" : "error"));
  }, [claim]);

  if (!claim) {
    return (
      <AuthCard>
        <AuthHeading title="This link isn't valid" sub="It may be incomplete. You can always reply to any TrailWatch email instead; it comes straight to the founder." />
      </AuthCard>
    );
  }

  const what = claim.k === "briefing" ? "briefing" : "alert";
  const useful = claim.v === "useful";
  return (
    <AuthCard>
      <AuthHeading
        title={useful ? "Thanks, glad it helped" : "Thanks for telling us"}
        sub={useful ? `We'll keep this ${what} coming.` : `We'll use this to make the next ${what} more useful.`}
      />
      {state === "error" ? <Banner tone="critical">We couldn&rsquo;t save that. Try the link again in a moment.</Banner> : null}
      {sent ? (
        <Banner tone="success">Got it. The founder reads every note.</Banner>
      ) : (
        <form
          className={styles.form}
          onSubmit={async (e) => {
            e.preventDefault();
            if (!comment.trim()) return;
            if (await save(claim, comment.trim())) setSent(true);
            else setState("error");
          }}
        >
          <label htmlFor="comment" className={styles.label}>
            {useful ? "What was most useful? (optional)" : "What would have made it useful? (optional)"}
          </label>
          <textarea id="comment" className={styles.textarea} rows={4} maxLength={2000} value={comment} onChange={(e) => setComment(e.target.value)} />
          <Button variant="primary" type="submit" full tall disabled={!comment.trim() || state === "saving"}>
            Send
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
