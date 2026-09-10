"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { PlusIcon } from "@/components/icons";
import { AddPageDialog, type AddPageCompetitor } from "@/components/AddPageDialog";

/**
 * Dashboard "Add page" entry point. There's no competitor context here, so the
 * modal opens in picker mode (§A of the Add flows) — the user chooses the
 * competitor first, then fills the page in.
 */
export function DashboardAddPage({
  competitors,
  pagesPerCompetitor,
  plan,
}: {
  competitors: AddPageCompetitor[];
  pagesPerCompetitor: number;
  plan: "free" | "paid";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <PlusIcon />
        Add page
      </Button>
      {open ? (
        <AddPageDialog
          competitors={competitors}
          pagesPerCompetitor={pagesPerCompetitor}
          plan={plan}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
