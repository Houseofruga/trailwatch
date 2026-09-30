import type { Metadata } from "next";
import { SettingsView } from "@/components/app/SettingsView";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewState } from "@/features/appData/devState";
import { getSettings } from "@/features/appData/mock";

export const metadata: Metadata = { title: "Settings" };

const STATES = [
  "default",
  "save-bar",
  "saved-toast",
  "save-failed",
  "invalid-slack-url",
  "slack-connected",
  "slack-test-failed",
  "no-alert-channels",
  "delete-account-modal",
  "loading",
] as const;
export type SettingsState = (typeof STATES)[number];

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const state = previewState((await searchParams).state, STATES, "default");
  const settings = await getSettings();
  if (state === "slack-connected" || state === "slack-test-failed") settings.slackConnected = true;
  if (state === "no-alert-channels") settings.emailAlerts = false;

  return (
    <>
      <SettingsView key={state} initial={settings} state={state} />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
