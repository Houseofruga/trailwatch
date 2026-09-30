// Stepper (onboarding progress) and SetupGuide (Home checklist).
import { IconCheck, IconX } from "./icons";
import styles from "./Guides.module.css";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol aria-label="Setup steps" className={styles.stepper}>
      {steps.map((label, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li key={label} className={styles.stepItem} style={{ display: "contents" }}>
            {i > 0 ? <span aria-hidden="true" className={`${styles.connector} ${done || now ? styles.connectorDone : ""}`} /> : null}
            <span aria-current={now ? "step" : undefined} className={`${styles.step} ${now ? styles.stepNow : ""}`}>
              <span className={`${styles.dot} ${done || now ? styles.dotFilled : ""}`}>
                {done ? <IconCheck size={13} /> : i + 1}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export type SetupTask = {
  label: string;
  done: boolean;
  description?: string;
  action?: React.ReactNode;
};

export function SetupGuide({ tasks, onDismiss }: { tasks: SetupTask[]; onDismiss?: () => void }) {
  const done = tasks.filter((t) => t.done).length;
  return (
    <section className={styles.guide} aria-labelledby="setup-guide-title">
      <div className={styles.guideHead}>
        <div className={styles.guideTitles}>
          <h2 id="setup-guide-title" className={styles.guideTitle}>
            Finish setting up
          </h2>
          <span className={styles.guideCount}>
            {done} of {tasks.length} done
          </span>
        </div>
        {onDismiss ? (
          <button type="button" aria-label="Dismiss setup guide" className={styles.guideDismiss} onClick={onDismiss}>
            <IconX />
          </button>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={tasks.length}
        aria-label="Setup progress"
        className={styles.guideTrack}
      >
        <div className={styles.guideFill} style={{ width: `${Math.round((done / tasks.length) * 100)}%` }} />
      </div>
      <ul className={styles.tasks}>
        {tasks.map((t) => (
          <li key={t.label} className={styles.task}>
            {t.done ? (
              <span aria-hidden="true" className={styles.taskDone}>
                <IconCheck size={13} />
              </span>
            ) : (
              <span aria-hidden="true" className={styles.taskTodo} />
            )}
            <div className={styles.taskText}>
              <span className={t.done ? styles.taskLabelDone : styles.taskLabel}>
                {t.label}
                {t.done ? <span className="visually-hidden"> (done)</span> : null}
              </span>
              {!t.done && t.description ? <span className={styles.taskDescription}>{t.description}</span> : null}
            </div>
            {!t.done ? t.action : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
