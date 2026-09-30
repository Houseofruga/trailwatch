"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { addCompetitor } from "@/features/appData/actions";

/** "Add competitor" dialog (04-Home / add-competitor modal), shared by Home and Competitors. */
export function AddCompetitorModal({
  open,
  onClose,
  remaining,
}: {
  open: boolean;
  onClose: () => void;
  remaining: number;
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

  return (
    <Modal
      open={open}
      title="Add competitor"
      onClose={close}
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="primary" type="submit" form="add-competitor-form" loading={busy} disabled={remaining <= 0}>
            Add competitor
          </Button>
        </>
      }
    >
      <p>Use the store&rsquo;s own website, not an Amazon or Etsy page. We&rsquo;ll read their catalog and key pages; it takes about a minute.</p>
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
          help={remaining > 0 ? `You can add ${remaining} more during the beta.` : "That's the beta limit. Remove one to add another."}
          disabled={remaining <= 0}
        />
      </form>
    </Modal>
  );
}
