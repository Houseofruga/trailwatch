"use client";

import { useEffect, useRef, useState } from "react";
import type { SettingsState } from "@/app/(app)/settings/page";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card, CardSection } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Feedback";
import { IconHash } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { PageBody, PageHeader } from "@/components/ui/Page";
import { SaveBar } from "@/components/ui/SaveBar";
import { FormSelect } from "@/components/ui/Select";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import { Toggle } from "@/components/ui/Toggle";
import { deleteAccount } from "@/features/account/actions";
import * as actions from "@/features/appData/actions";
import { ago } from "@/features/appData/format";
import type { MutableAlertType, Settings } from "@/features/appData/types";
import { BetaPlanCard } from "./BetaParts";
import styles from "./SettingsView.module.css";

const ALERT_TYPES: { type: MutableAlertType; label: string; description: string }[] = [
  { type: "sitewide_sale_detected", label: "Sitewide sales", description: "A big share of a catalog goes on sale at once." },
  { type: "promo_launched", label: "Promotions and banners", description: "New sale banners, codes and homepage messages." },
  { type: "price_position_change", label: "Cheaper than you", description: "A similar product is now priced below yours." },
  { type: "sale_started", label: "Big sales", description: "30% or more off a single product." },
  { type: "product_launched", label: "New products", description: "Launches and new collections." },
  { type: "sold_out", label: "Best-sellers selling out", description: "Popular products that go out of stock." },
];

const HOURS = [6, 7, 8, 9, 10, 11].map((h) => ({ value: String(h), label: `${h}:00 AM` }));
const TIME_ZONES = [
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Phoenix", label: "Arizona" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
];

const SLACK_PREFIX = "https://hooks.slack.com/";

type Form = Pick<Settings, "emailAlerts" | "sendTo" | "alertTypes" | "briefing"> & { storeDomain: string; name: string };

function Section({ id, title, description, children }: { id?: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className={styles.section} id={id}>
      <div className={styles.sectionText}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <p className={styles.sectionDescription}>{description}</p>
      </div>
      <div className={styles.sectionBody}>{children}</div>
    </div>
  );
}

export function SettingsView({
  initial,
  state,
  preview = false,
}: {
  initial: Settings;
  state: SettingsState;
  /** Design-review preview: buttons act on the mock screen only. */
  preview?: boolean;
}) {
  const toast = useToast();
  const loading = state === "loading";
  const start: Form = {
    emailAlerts: initial.emailAlerts,
    sendTo: initial.sendTo,
    alertTypes: initial.alertTypes,
    briefing: initial.briefing,
    storeDomain: initial.ownStore?.domain ?? "",
    name: initial.account.name,
  };
  const [saved, setSaved] = useState<Form>(start);
  const [form, setForm] = useState<Form>(
    state === "save-bar" || state === "save-failed" ? { ...start, alertTypes: { ...start.alertTypes, sold_out: false } } : start,
  );
  const [saving, setSaving] = useState(false);
  const [slackConnected, setSlackConnected] = useState(initial.slackConnected);
  const [slackUrl, setSlackUrl] = useState(state === "invalid-slack-url" ? "https://slack.com/app/T04XYZ" : "");
  const [slackError, setSlackError] = useState<string | null>(
    state === "invalid-slack-url" ? `Enter a Slack webhook URL. It starts with ${SLACK_PREFIX}` : null,
  );
  const [slackTestFailed, setSlackTestFailed] = useState(state === "slack-test-failed");
  const [testing, setTesting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(state === "delete-account-modal");
  const [deleteText, setDeleteText] = useState(state === "delete-account-modal" ? "delet" : "");
  const [deleting, setDeleting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const shownToast = useRef(false);

  useEffect(() => {
    if (shownToast.current) return;
    shownToast.current = true;
    if (state === "saved-toast") toast("Settings saved");
    if (state === "save-failed") toast("Couldn't save. Try again.", { error: true });
  }, [state, toast]);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    const res = preview ? ({ ok: true } as const) : await actions.saveSettings(form);
    setSaving(false);
    if (!res.ok) return toast(res.error, { error: true });
    setSaved(form);
    toast("Settings saved");
  }

  async function connectSlack() {
    if (!slackUrl.startsWith(SLACK_PREFIX)) return setSlackError(`Enter a Slack webhook URL. It starts with ${SLACK_PREFIX}`);
    setConnecting(true);
    const res = preview ? ({ ok: true } as const) : await actions.connectSlack(slackUrl);
    setConnecting(false);
    if (!res.ok) return setSlackError(res.error);
    setSlackError(null);
    setSlackUrl("");
    setSlackConnected(true);
    toast("Connected to Slack");
  }

  async function disconnectSlack() {
    const res = preview ? ({ ok: true } as const) : await actions.disconnectSlack();
    if (!res.ok) return toast(res.error, { error: true });
    setSlackConnected(false);
    setSlackTestFailed(false);
  }

  async function sendTest() {
    setTesting(true);
    const res = preview ? ({ ok: true } as const) : await actions.sendSlackTest();
    setTesting(false);
    if (!res.ok) return setSlackTestFailed(true);
    setSlackTestFailed(false);
    toast("Test message sent to Slack");
  }

  async function confirmDelete() {
    if (preview) return toast("Preview only: accounts aren't deleted from preview screens.");
    setDeleting(true);
    const res = await deleteAccount(); // redirects home on success
    setDeleting(false);
    if (res?.error) toast(res.error, { error: true });
  }

  const noChannels = !form.emailAlerts && !slackConnected;
  const loadingCard = (
    <Card>
      <Spinner label="Loading settings…" />
    </Card>
  );

  return (
    <PageBody>
      {dirty ? <SaveBar saving={saving} onSave={save} onDiscard={() => setForm(saved)} /> : null}
      <PageHeader title="Settings" />

      <div className={styles.sections}>
        <Section title="Where alerts go" description="Instant alerts go to email, Slack, or both.">
          {loading ? (
            loadingCard
          ) : (
            <Card>
              <div className={styles.stack}>
                {noChannels ? (
                  <Banner tone="warning">You won&rsquo;t get instant alerts. They&rsquo;ll only show up here and in your Monday briefing.</Banner>
                ) : null}
                <Toggle
                  label="Email alerts"
                  description="Big moves, the moment we see them."
                  checked={form.emailAlerts}
                  onChange={(v) => set("emailAlerts", v)}
                />
                <TextField
                  id="send-to"
                  label="Send to"
                  type="email"
                  value={form.sendTo}
                  disabled={!form.emailAlerts}
                  onChange={(e) => set("sendTo", e.target.value)}
                />
                <div className={styles.slackHead}>
                  <IconHash />
                  <span>Slack</span>
                  {slackConnected ? <Badge tone="success">Connected</Badge> : null}
                </div>
                {slackConnected ? (
                  <>
                    <div className={styles.slackConnected}>
                      <span>Connected to Slack</span>
                      <div className={styles.inlineActions}>
                        <Button loading={testing} onClick={sendTest}>
                          Send test
                        </Button>
                        <Button variant="plainDark" onClick={() => void disconnectSlack()}>
                          Disconnect
                        </Button>
                      </div>
                    </div>
                    {slackTestFailed ? (
                      <Banner
                        tone="critical"
                        title="Slack test failed"
                        actions={<Button onClick={() => void disconnectSlack()}>Reconnect Slack</Button>}
                      >
                        We couldn&rsquo;t post to your Slack channel. The webhook may have been removed in Slack. Create a new one and reconnect.
                      </Banner>
                    ) : null}
                  </>
                ) : (
                  <TextField
                    id="slack-webhook"
                    label="Slack webhook"
                    placeholder="https://hooks.slack.com/services/…"
                    value={slackUrl}
                    autoComplete="off"
                    onChange={(e) => setSlackUrl(e.target.value)}
                    error={slackError}
                    help="Paste an incoming webhook URL from Slack. We post big moves to that channel."
                    trailing={
                      <Button loading={connecting} onClick={() => void connectSlack()}>
                        Connect
                      </Button>
                    }
                  />
                )}
              </div>
            </Card>
          )}
        </Section>

        <Section title="Which moves alert you" description="We only alert you about big moves. Everything else waits for Monday.">
          {loading ? (
            loadingCard
          ) : (
            <Card flush>
              {ALERT_TYPES.map((a) => (
                <CardSection key={a.type}>
                  <Toggle
                    label={a.label}
                    description={a.description}
                    checked={form.alertTypes[a.type]}
                    onChange={(v) => set("alertTypes", { ...form.alertTypes, [a.type]: v })}
                  />
                </CardSection>
              ))}
            </Card>
          )}
        </Section>

        <Section id="briefing" title="Monday briefing" description="A short email every Monday morning.">
          {loading ? (
            loadingCard
          ) : (
            <Card>
              <div className={styles.stack}>
                <Toggle
                  label="Send the Monday briefing"
                  description="Every Monday: what changed last week and what it means for you."
                  checked={form.briefing.enabled}
                  onChange={(v) => set("briefing", { ...form.briefing, enabled: v })}
                />
                <div className={styles.twoCol}>
                  <FormSelect
                    id="briefing-time"
                    label="Time"
                    value={String(form.briefing.hour)}
                    options={HOURS}
                    disabled={!form.briefing.enabled}
                    onChange={(v) => set("briefing", { ...form.briefing, hour: Number(v) })}
                  />
                  <FormSelect
                    id="briefing-zone"
                    label="Time zone"
                    value={form.briefing.timeZone}
                    options={TIME_ZONES}
                    disabled={!form.briefing.enabled}
                    onChange={(v) => set("briefing", { ...form.briefing, timeZone: v })}
                  />
                </div>
              </div>
            </Card>
          )}
        </Section>

        <Section id="your-store" title="Your store" description="We compare competitor prices with your products.">
          {loading ? (
            loadingCard
          ) : (
            <Card>
              <div className={styles.stack}>
                <TextField
                  id="store-domain"
                  label="Your store’s website"
                  prefix="https://"
                  placeholder="yourstore.com"
                  value={form.storeDomain}
                  onChange={(e) => set("storeDomain", e.target.value)}
                />
                {initial.ownStore && form.storeDomain === initial.ownStore.domain ? (
                  <div className={styles.storeMeta}>
                    <span>
                      {initial.ownStore.products !== null
                        ? `${initial.ownStore.products.toLocaleString("en-US")} products · checked ${ago(initial.ownStore.checkedAt)}`
                        : "Reading your catalog…"}
                    </span>
                    <Button variant="plainDark" onClick={() => set("storeDomain", "")}>
                      Remove
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
          )}
        </Section>

        <Section id="plan" title="Plan" description="Your beta plan.">
          <Card>
            <BetaPlanCard beta={initial.beta} />
          </Card>
        </Section>

        <Section title="Account" description="Your login and account.">
          <Card flush>
            <CardSection>
              <div className={styles.stack}>
                <TextField id="account-name" label="Name" value={form.name} onChange={(e) => set("name", e.target.value)} />
                <TextField id="account-email" label="Email" value={initial.account.email} readOnly help="Your login email. Contact us to change it." />
              </div>
            </CardSection>
            {initial.account.hasPassword ? (
              <CardSection>
                <div className={styles.rowAction}>
                  <p className={styles.rowLabel}>Password</p>
                  <Button href="/forgot-password">Change password</Button>
                </div>
              </CardSection>
            ) : null}
            <CardSection>
              <div className={styles.rowAction}>
                <div>
                  <p className={styles.rowLabel}>Delete account</p>
                  <p className={styles.rowDescription}>Removes your competitors, history and settings.</p>
                </div>
                <Button variant="critical" onClick={() => setDeleteOpen(true)}>
                  Delete account
                </Button>
              </div>
            </CardSection>
          </Card>
        </Section>
      </div>

      <Modal
        open={deleteOpen}
        title="Delete your account?"
        onClose={() => (setDeleteOpen(false), setDeleteText(""))}
        footer={
          <>
            <Button onClick={() => (setDeleteOpen(false), setDeleteText(""))}>Cancel</Button>
            <Button
              variant="critical"
              disabled={deleteText !== "delete"}
              loading={deleting}
              onClick={() => void confirmDelete()}
            >
              Delete account
            </Button>
          </>
        }
      >
        <p>This deletes your competitors, their history and your settings. You can&rsquo;t undo it.</p>
        <TextField
          id="confirm-delete"
          label={'Type "delete" to confirm'}
          value={deleteText}
          autoComplete="off"
          onChange={(e) => setDeleteText(e.target.value)}
        />
      </Modal>
    </PageBody>
  );
}
