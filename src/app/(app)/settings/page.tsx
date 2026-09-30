import type { Metadata } from "next";
import { SettingsView } from "@/components/app/SettingsView";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { previewEnabled, previewState } from "@/features/appData/devState";
import * as mock from "@/features/appData/mock";
import * as real from "@/features/appData/queries";

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
  const raw = (await searchParams).state;
  const state = previewState(raw, STATES, "default");
  const preview = previewEnabled && !!raw;
  const settings = await (preview ? mock : real).getSettings();
  if (state === "slack-connected" || state === "slack-test-failed") settings.slackConnected = true;
  if (state === "no-alert-channels") settings.emailAlerts = false;

  return (
    <>
      <SettingsView key={state} initial={settings} state={state} preview={preview} />
      <DevStateBar states={STATES} current={state} />
    </>
  );
}
