"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { OptionToggle } from "@/components/ui/OptionToggle";
import { TextArea } from "@/components/ui/TextArea";
import { useToast } from "@/components/ui/Toast";
import { sendFeedback } from "@/features/appData/actions";
import { BETA_CONFIG } from "@/features/beta/config";
import styles from "./FeedbackModal.module.css";

type Kind = "feedback" | "feature";

const PLACEHOLDER: Record<Kind, string> = {
  feedback: "What’s working, what isn’t, what’s confusing…",
  feature: "What would you like TrailWatch to do?",
};

/** "Send feedback" (DESIGN 12-Beta 12b): goes straight to the founder. `demo` saves nothing (preview states). */
export function FeedbackModal({ open, onClose, demo }: { open: boolean; onClose: () => void; demo?: boolean }) {
  const toast = useToast();
  const pathname = usePathname();
  const [kind, setKind] = useState<Kind>("feedback");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  const close = () => {
    setError(false);
    onClose();
  };

  const send = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setError(false);
    const res = demo ? { ok: true } : await sendFeedback({ kind, message, page: pathname });
    setSending(false);
    if (!res.ok) return setError(true);
    setMessage("");
    setKind("feedback");
    onClose();
    toast(`Thanks, sent to ${BETA_CONFIG.founderName}. He’ll reply by email.`);
  };

  return (
    <Modal
      open={open}
      title="Send feedback"
      width={520}
      onClose={close}
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" onClick={send} disabled={!message.trim()} loading={sending}>
            Send
          </Button>
        </>
      }
    >
      <div className={styles.stack}>
        {error ? <Banner tone="critical">Couldn&rsquo;t send that. Try again.</Banner> : null}
        <OptionToggle
          label="Type of message"
          value={kind}
          onChange={setKind}
          options={[
            { value: "feedback", label: "Feedback" },
            { value: "feature", label: "Request a feature" },
          ]}
        />
        <TextArea
          id="feedback-message"
          label="Your message"
          hideLabel
          rows={5}
          minHeight={120}
          maxLength={4000}
          placeholder={PLACEHOLDER[kind]}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          help={`This goes straight to ${BETA_CONFIG.founderName}, the founder. He replies to every message.`}
        />
      </div>
    </Modal>
  );
}
