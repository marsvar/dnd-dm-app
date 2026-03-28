"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import WizardLayout from "../welcome/WizardLayout";
import { Button, Card, Checkbox, FieldLabel, Input, Select } from "../../components/ui";
import { useAppStore } from "../../lib/store/appStore";
import type { Pc } from "../../lib/models/types";

type ImportResponse = { pc: Omit<Pc, "id"> };

const ACTION_KEY = "invite-action";
const SRD_CLASSES = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
];
const SRD_RACES = ["Dwarf", "Elf", "Halfling", "Human", "Dragonborn", "Gnome", "Half-Elf", "Half-Orc", "Tiefling"];

export default function PlayerImportPage() {
  const router = useRouter();
  const { state } = useAppStore();
  const campaigns = state.campaigns;
  const [inviteMode, setInviteMode] = useState(false);
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [characterId, setCharacterId] = useState("");
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<Omit<Pc, "id"> | null>(null);
  const [ackNonSrd, setAckNonSrd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
    const existing = sessionStorage.getItem(ACTION_KEY);
    if (existing) return existing;
    const next = crypto.randomUUID();
    sessionStorage.setItem(ACTION_KEY, next);
    return next;
  }, []);

  const canImport = characterId.trim().length > 0 && (!inviteMode ? Boolean(campaignId) : true);

  const fetchPreview = async () => {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch(`/api/import-dndbeyond?id=${encodeURIComponent(characterId)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Import failed");
      }
      const data = (await res.json()) as ImportResponse;
      setPreview(data.pc);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    if (needsReview && !ackNonSrd) return;
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/invites/create-pc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: inviteMode ? "invite" : "normal",
          actionId,
          payload: preview,
          campaignId: inviteMode ? undefined : campaignId,
        }),
      });

      if (res.status === 409) {
        throw new Error("Newer attempt detected. Reload to continue.");
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Create failed");
      }

      setSuccess(true);
      sessionStorage.removeItem(ACTION_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setImporting(false);
    }
  };

  const needsReview = preview
    ? !SRD_CLASSES.includes(preview.className) || !SRD_RACES.includes(preview.race)
    : false;

  if (success) {
    return (
      <WizardLayout
        step={3}
        title="PC ready"
        subtitle="Your imported character has been assigned to you."
      >
        <div className="space-y-4">
          <Card className="text-sm text-muted">
            You can return to My PCs or import another character later.
          </Card>
          <Button type="button" onClick={() => router.push("/player")}>Go to My PCs</Button>
        </div>
      </WizardLayout>
    );
  }

  return (
    <WizardLayout
      step={inviteMode ? 3 : 1}
      title={inviteMode ? "Import your character" : "Import a character"}
      subtitle="Paste your D&D Beyond character ID to preview and import."
      showBack={inviteMode}
      onBack={() => router.push("/player/welcome?step=choose")}
    >
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
          <FieldLabel htmlFor="characterId">D&D Beyond ID</FieldLabel>
          <Input
            id="characterId"
            value={characterId}
            onChange={(event) => setCharacterId(event.target.value)}
            placeholder="123456"
          />
        </div>

        {preview ? (
          <Card className="space-y-2 text-sm text-muted">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-foreground">{preview.name}</p>
              <Button type="button" variant="ghost" onClick={() => setPreview(null)}>
                Reset
              </Button>
            </div>
            <p>
              {preview.className} • {preview.race} • Level {preview.level}
            </p>
            {needsReview ? (
              <div className="space-y-2 rounded-xl border border-amber-400/50 bg-amber-100/40 p-3 text-xs text-amber-900">
                <p className="font-semibold">Non-SRD content detected</p>
                <p>
                  This character includes a class or race outside SRD. You can import it, but you’ll need to
                  review the details manually afterward.
                </p>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={ackNonSrd}
                    onChange={(event) => setAckNonSrd(event.target.checked)}
                  />
                  <span>I understand and will review the sheet.</span>
                </label>
              </div>
            ) : null}
            <Button
              type="button"
              onClick={confirmImport}
              disabled={importing || (needsReview && !ackNonSrd)}
            >
              {importing ? "Importing…" : "Confirm import"}
            </Button>
          </Card>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={fetchPreview} disabled={!canImport || importing}>
              {importing ? "Fetching…" : "Fetch preview"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push("/player/welcome?step=choose") }>
              Back
            </Button>
          </div>
        )}
      </div>
    </WizardLayout>
  );
}
