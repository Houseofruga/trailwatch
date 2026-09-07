import styles from "./welcome.module.css";

// v3 onboarding progress: "1 — 2" with the active step filled and a label. Only
// shown for the free two-step flow; the Pro path is single-step and omits it.
export function StepIndicator({ step, label }: { step: 1 | 2; label: string }) {
  return (
    <div className={styles.steps}>
      <span className={step === 1 ? styles.stepDotActive : styles.stepDot}>1</span>
      <span className={styles.stepBar} />
      <span className={step === 2 ? styles.stepDotActive : styles.stepDot}>2</span>
      <span className={styles.stepLabel}>{label}</span>
    </div>
  );
}
