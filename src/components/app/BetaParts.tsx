import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconCheckCircle, IconExternal } from "@/components/ui/icons";
import { StepProgress } from "@/components/ui/StepProgress";
import { BETA_CONFIG as C, betaEndsLabel, maxDiscountPct } from "@/features/beta/config";
import type { BetaStatus } from "@/features/appData/types";
import styles from "./BetaParts.module.css";

// Beta-member pieces (DESIGN 12-Beta): the Settings plan card (12c), the
// onboarding note (12d) and the sidebar call prompt.

const MAX = maxDiscountPct();

function BookButton({ url, label }: { url: string; label: string }) {
  return (
    <Button href={url} external icon={<IconExternal />} aria-label={`${label} (opens in a new tab)`}>
      {label}
    </Button>
  );
}

/** 12c: Settings › Plan. */
export function BetaPlanCard({ beta }: { beta: BetaStatus }) {
  if (!beta.member) {
    return (
      <div className={styles.planOff}>
        <span className={styles.planName}>Free during the beta</span>
        <span className={styles.muted}>Beta member spots are full</span>
      </div>
    );
  }
  const left = beta.callsNeeded - beta.callsDone;
  const unlocked = left <= 0;
  return (
    <div className={styles.plan}>
      <div className={styles.planHead}>
        <span className={styles.planName}>Free beta</span>
        <Badge tone="success">Beta member</Badge>
      </div>
      <p className={styles.planLine}>Free during the beta. Paid plans start {betaEndsLabel()}.</p>
      <div className={`${styles.offer} ${unlocked ? styles.offerDone : ""}`}>
        <span className={styles.locked}>
          <IconCheckCircle />
          {C.baseDiscountPct + C.perCallDiscountPct * beta.callsDone}% off for life, locked in
        </span>
        <span className={styles.muted}>Your price never goes up.</span>
        {unlocked ? (
          <span className={styles.thanks}>Thanks for the three calls. Your feedback is shaping what Trailwatch becomes.</span>
        ) : (
          <>
            <StepProgress label={`Feedback calls: ${beta.callsDone} of ${beta.callsNeeded}`} done={beta.callsDone} total={beta.callsNeeded} />
            <span className={styles.muted}>
              Each short call adds {C.perCallDiscountPct}%. {left === 1 ? "One more call" : `${left} more calls`} and it becomes {MAX}% off for life.
            </span>
            {beta.bookingUrl ? (
              <div>
                <BookButton url={beta.bookingUrl} label={`Book a ${C.callMinutes}-min call with ${C.founderName}`} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/** 12d: the note on the last onboarding step, for new beta members. */
export function BetaNote({ beta }: { beta: BetaStatus }) {
  if (!beta.member) return null;
  return (
    <div className={styles.note}>
      <div>
        <Badge tone="success">Beta member</Badge>
      </div>
      <p className={styles.noteTitle}>
        You&rsquo;re one of our first {C.foundingCap} beta members: up to {MAX}% off for life once paid plans start.
      </p>
      <p className={styles.noteText}>
        Trailwatch is free during the beta. You have {C.baseDiscountPct}% already, and each of {C.callsNeeded} short feedback calls with {C.founderName} adds{" "}
        {C.perCallDiscountPct}% more. Your price never goes up.
      </p>
      {beta.bookingUrl ? (
        <div>
          <BookButton url={beta.bookingUrl} label={`Book a ${C.callMinutes}-min call`} />
        </div>
      ) : null}
    </div>
  );
}

/** Sidebar prompt: beta members with calls still to do, when there's a booking page. */
export function SidebarCallPrompt({ beta }: { beta: BetaStatus }) {
  const left = beta.callsNeeded - beta.callsDone;
  if (!beta.member || left <= 0 || !beta.bookingUrl) return null;
  return (
    <div className={styles.prompt}>
      <span className={styles.promptTitle}>Talk to {C.founderName}</span>
      <span className={styles.promptLine}>
        Free during the beta. Each feedback call adds {C.perCallDiscountPct}% off for life, up to {MAX}%, once paid plans start.
      </span>
      <StepProgress compact label={`${beta.callsDone} of ${beta.callsNeeded} calls`} done={beta.callsDone} total={beta.callsNeeded} />
      <a href={beta.bookingUrl} target="_blank" rel="noopener noreferrer" className={styles.promptButton} aria-label={`Book a ${C.callMinutes}-min call (opens in a new tab)`}>
        <IconExternal size={14} />
        Book a {C.callMinutes}-min call
      </a>
    </div>
  );
}
