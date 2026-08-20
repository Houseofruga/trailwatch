"use server";

import { revalidatePath } from "next/cache";
import { runCheckForPage } from "./runCheck";

export async function checkPageNow(pageId: string): Promise<string> {
  const result = await runCheckForPage(pageId);
  revalidatePath("/dashboard");
  revalidatePath("/competitors");

  switch (result.status) {
    case "skipped-robots":
      return "That page's robots.txt disallows checking it.";
    case "fetch-error":
      return `Couldn't fetch that page: ${result.message}`;
    case "unchanged":
      return "No change since the last check.";
    case "first-check":
      return "First check complete — this is now the baseline.";
    case "recorded":
      return result.meaningful
        ? "Meaningful change detected."
        : "Changed, but it looked trivial — filtered out.";
  }
}
