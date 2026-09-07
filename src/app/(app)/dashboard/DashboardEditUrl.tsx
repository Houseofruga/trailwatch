"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditPageDialog } from "@/components/EditPageDialog";
import styles from "./page.module.css";

// The "Edit URL" affordance on a broken/unreachable dashboard row. Opens the
// same modal the Competitors board uses (its "Edit URL" kebab item) instead of
// navigating away, so a user can fix a wrong URL without leaving the dashboard.
export function DashboardEditUrl({
  pageId,
  url,
  label,
  siblingDomain,
}: {
  pageId: string;
  url: string;
  label: string;
  siblingDomain: string | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <>
      <button type="button" className={styles.pageErrorFixBtn} onClick={() => setOpen(true)}>
        Edit URL
      </button>
      {open ? (
        <EditPageDialog
          pageId={pageId}
          initialUrl={url}
          initialLabel={label}
          siblingDomain={siblingDomain}
          onClose={() => setOpen(false)}
          onSaved={() => router.refresh()}
        />
      ) : null}
    </>
  );
}
