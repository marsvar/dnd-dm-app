"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import WizardLayout from "../welcome/WizardLayout";
import { Button, Card, FieldLabel, Input, Select } from "../../components/ui";
import { useAppStore } from "../../lib/store/appStore";

type CreateResponse = {
  pcId: string | null;
  status: string;
};

const ACTION_KEY = "invite-action";

export default function PlayerOnboardingPage() {
  const router = useRouter();
  const { state } = useAppStore();
  const campaigns = state.campaigns;
  const [inviteMode, setInviteMode] = useState(false);
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [race, setRace] = useState("");
  const [level, setLevel] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [allowNew, setAllowNew] = useState(false);

  useEffect(() => {
    fetch("/api/invites/heartbeat", { method: "POST" })
      .then((res) => {
        setInviteMode(res.ok);
      })
      .catch(() => setInviteMode(false));
  }, []);

  useEffect(() => {
    if (campaigns.length && !campaignId) {
      setCampaignId(campaigns[0].id);
    }
  }, [campaigns, campaignId]);

  const actionId = useMemo(() => {
    if (allowNew) {
      const next = crypto.randomUUID();
      sessionStorage.setItem(ACTION_KEY, next);
      return next;
    }
    const existing = sessionStorage.getItem(ACTION_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(ACTION_KEY, next);
    return next;
  }, [allowNew]);

  const payload = useMemo(
    () => ({
      name,
      className,
      race,
      level,
    }),
    [name, className, race, level]
  );

  const canSubmit = name.trim().length > 0 && (!inviteMode ? Boolean(campaignId) : true);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/invites/create-pc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: inviteMode ? "invite" : "normal",
          actionId,
          payload,
          campaignId: inviteMode ? undefined : campaignId,
          allowNew,
        }),
      });

      if (res.status === 409) {
        throw new Error("Newer attempt detected. Reload to continue.");
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Create failed");
      }

      const data = (await res.json()) as CreateResponse;
      if (data.status === "needs_assignment") {
        setError("PC created, assignment failed. Retry from My PCs.");
        return;
      }

      setSuccess(true);
      sessionStorage.removeItem(ACTION_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
      setAllowNew(false);
    }
  };

  const form = (
    <div className="space-y-6">
      {error ? (
        <Card className="border-red-500/40 bg-red-500/5 text-sm text-red-700">{error}</Card>
      ) : null}

      {!inviteMode ? (
        <div className="space-y-2">
          <FieldLabel htmlFor="campaign">Campaign</FieldLabel>
          <Select
            id="campaign"
            value={campaignId}
            onChange={(event) => setCampaignId(event.target.value)}
          >
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <FieldLabel htmlFor="name">Character name</FieldLabel>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Valeria Stormwind"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel htmlFor="className">Class</FieldLabel>
          <Input
            id="className"
            value={className}
            onChange={(event) => setClassName(event.target.value)}
            placeholder="Fighter"
          />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="race">Race</FieldLabel>
          <Input
            id="race"
            value={race}
            onChange={(event) => setRace(event.target.value)}
            placeholder="Human"
          />
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor="level">Level</FieldLabel>
        <Input
          id="level"
          type="number"
          min={1}
          max={20}
          value={level}
          onChange={(event) => setLevel(Number(event.target.value || 1))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleSubmit} disabled={!canSubmit || submitting}>
          {submitting ? "Creating…" : "Create character"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/player/welcome?step=choose") }>
          Back
        </Button>
      </div>
    </div>
  );

  if (success) {
    return (
      <WizardLayout
        step={3}
        title="PC ready"
        subtitle="Your character has been assigned to you."
        showBack={false}
      >
        <div className="space-y-4">
          <Card className="text-sm text-muted">
            You can return to My PCs or create another character for this campaign.
          </Card>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => router.push("/player")}>Go to My PCs</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAllowNew(true);
                setSuccess(false);
              }}
            >
              Create another PC
            </Button>
          </div>
        </div>
      </WizardLayout>
    );
  }

  return (
    <WizardLayout
      step={inviteMode ? 3 : 1}
      title={inviteMode ? "Create your character" : "Create a character"}
      subtitle={inviteMode ? "This character will be assigned to you automatically." : "Choose a campaign and start with the basics."}
      showBack={inviteMode}
      onBack={() => router.push("/player/welcome?step=choose")}
    >
      {form}
    </WizardLayout>
  );
}
