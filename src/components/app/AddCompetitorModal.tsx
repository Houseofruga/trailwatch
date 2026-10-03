"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { addCompetitor } from "@/features/appData/actions";
import { CompetitorSuggestions, type SuggestPreview } from "./CompetitorSuggestions";
import styles from "./AddCompetitorModal.module.css";

/**
 * "Add competitor" dialog (04-Home / add-competitor modal, with suggestions from
 * 02b-Suggestions), shared by Home and Competitors. Typing a known store stays
 * the main path; a suggestion is added in place and the dialog stays open.
 */
export function AddCompetitorModal({
  open,
  onClose,
  remaining,
  preview,
}: {
  open: boolean;
  onClose: () => void;
  remaining: number;
  /** Design-review previews show mock suggestions instead of searching. */
  preview?: SuggestPreview;
}) {
  const router = useRouter();
  const toast = useToast();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function close() {
    setValue("");
    setError(null);
    onClose();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await addCompetitor(value);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    close();
    toast("Competitor added");
    router.push(`/competitors/${res.competitorId}/report`);
  }

  async function addSuggestion(domain: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const res = await addCompetitor(domain);
    if (!res.ok) return res;
    toast("Competitor added");
    router.refresh();
    return { ok: true };
  }

  return (
    <Modal
      open={open}
      title="Add competitor"
      onClose={close}
      width={560}
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button
            variant="primary"
            type="submit"
            form="add-competitor-form"
            loading={busy}
            disabled={remaining <= 0 || !value.trim()}
          >
            Add competitor
          </Button>
        </>
      }
    >
      <form id="add-competitor-form" onSubmit={submit} noValidate>
        <TextField
          id="add-competitor-url"
          label="Competitor’s website"
          prefix="https://"
          placeholder="dewlane.com"
          inputMode="url"
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={error}
          help={
            remaining > 0
              ? "Use the store’s own website, not an Amazon or Etsy page."
              : "That's the beta limit. Remove one to add another."
          }
          disabled={remaining <= 0}
        />
      </form>
      {open ? (
        <CompetitorSuggestions
          className={styles.suggestions}
          full={remaining <= 0}
          preview={preview}
          onAdd={addSuggestion}
        />
      ) : null}
    </Modal>
  );
}
