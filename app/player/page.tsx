"use client";

/**
 * /player — "Who are you?" selector.
 * Players pick their campaign (if more than one exists) and then their
 * character; selections are persisted in usePlayerSession.
 *
 * PCs with a PIN set by the DM are selectable — the player enters the PIN
 * to unlock their character. PCs without a PIN are visible but inaccessible
 * (the DM must set one first).
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { useAppStore } from "../lib/store/appStore";
import { usePlayerSession } from "../lib/store/usePlayerSession";
import {
  Button,
  Card,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  Input,
  SectionTitle,
} from "../components/ui";
import { ParticipantAvatar } from "../components/ParticipantAvatar";
import type { Pc } from "../lib/models/types";

export default function PlayerSelectPage() {
  const { state } = useAppStore();
  const { campaignId, setCampaignId, selectPc, clearSession } = usePlayerSession();
  const router = useRouter();

  const campaigns = state.campaigns;

  // Auto-select the only campaign when there is exactly one.
  useEffect(() => {
    if (campaigns.length === 1 && campaignId !== campaigns[0].id) {
      setCampaignId(campaigns[0].id);
    }
  }, [campaigns, campaignId, setCampaignId]);

  // PCs visible to the player: scoped to the selected campaign (via join table),
  // or the full global list when no campaign is selected (zero-campaign legacy mode).
  const visiblePcs = useMemo(() => {
    if (!campaignId) return state.pcs;
    const memberPcIds = new Set(
      state.campaignMembers
        .filter((m) => m.campaignId === campaignId)
        .map((m) => m.pcId)
    );
    return state.pcs.filter((pc) => memberPcIds.has(pc.id));
  }, [campaignId, state.pcs, state.campaignMembers]);

  // PIN dialog state
  const [pendingPc, setPendingPc] = useState<Pc | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  function handlePcClick(pc: Pc) {
    if (!pc.pin) return; // no PIN = inaccessible
    setPendingPc(pc);
    setPinInput("");
    setPinError(false);
  }

  function handlePinSubmit() {
    if (!pendingPc) return;
    if (pinInput === pendingPc.pin) {
      selectPc(pendingPc.id);
      setPendingPc(null);
      router.push("/player/character");
    } else {
      setPinError(true);
    }
  }

  function handleDialogClose() {
    setPendingPc(null);
    setPinInput("");
    setPinError(false);
  }

  // Show campaign picker when there are multiple campaigns and none is selected.
  const needsCampaignPick = campaigns.length > 1 && !campaignId;

  return (
    <div className="flex min-h-[calc(100dvh-65px)] flex-col items-center justify-start px-4 pt-12">
      <div className="w-full max-w-md">
        {/* --- Campaign picker --- */}
        {campaigns.length > 1 && (
          <div className="mb-8">
            <SectionTitle
              title="Select campaign"
              subtitle="Choose the campaign you're playing in."
            />
            <ul className="flex flex-col gap-3">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setCampaignId(c.id)}
                    className="w-full text-left"
                  >
                    <Card
                      className={`flex items-center gap-4 transition-shadow hover:shadow-xl active:scale-[0.98] ${
                        campaignId === c.id ? "border-accent shadow-[0_0_0_2px_var(--accent)]" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold text-foreground">
                          {c.name}
                        </p>
                        {c.description && (
                          <p className="truncate text-sm text-muted">{c.description}</p>
                        )}
                      </div>
                      {campaignId === c.id && (
                        <div className="shrink-0 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                          Selected
                        </div>
                      )}
                    </Card>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* --- PC picker (hidden until campaign is resolved) --- */}
        {!needsCampaignPick && (
          <>
            <SectionTitle
              title="Who are you?"
              subtitle="Select your character to open your player view."
            />

            {visiblePcs.length === 0 ? (
              <Card className="text-center text-sm text-muted py-10">
                {campaignId
                  ? "No characters in this campaign yet. Ask your DM to add players."
                  : "No characters yet. Ask your DM to add players in the Party tab."}
              </Card>
            ) : (
              <ul className="flex flex-col gap-3">
                {visiblePcs.map((pc) => {
                  const hasPin = Boolean(pc.pin);
                  return (
                    <li key={pc.id}>
                      <button
                        type="button"
                        onClick={() => handlePcClick(pc)}
                        disabled={!hasPin}
                        className="w-full text-left disabled:cursor-not-allowed"
                        aria-label={
                          hasPin
                            ? `Select ${pc.name} — enter PIN`
                            : `${pc.name} — no PIN set, ask your DM`
                        }
                      >
                        <Card
                          className={`flex items-center gap-4 transition-shadow ${
                            hasPin
                              ? "hover:shadow-xl active:scale-[0.98]"
                              : "opacity-50"
                          }`}
                        >
                          <ParticipantAvatar
                            name={pc.name}
                            visual={pc.visual}
                            size="lg"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-base font-semibold text-foreground">
                              {pc.name}
                            </p>
                            <p className="truncate text-sm text-muted">
                              {pc.playerName && (
                                <span className="mr-2 text-accent">{pc.playerName}</span>
                              )}
                              {[pc.race, pc.className, `Level ${pc.level}`]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          {hasPin ? (
                            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-muted">
                              <Lock className="h-3 w-3" />
                              Enter PIN
                            </div>
                          ) : (
                            <div className="shrink-0 text-right text-xs text-muted/60">
                              Ask your DM
                              <br />
                              for a PIN
                            </div>
                          )}
                        </Card>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        <p className="mt-8 text-center text-xs text-muted">
          Not you?{" "}
          <Button variant="ghost" className="text-xs" onClick={() => clearSession()}>
            Change character
          </Button>
        </p>
      </div>

      {/* --- PIN dialog --- */}
      <Dialog open={Boolean(pendingPc)} onOpenChange={(open) => !open && handleDialogClose()}>
        {pendingPc && (
          <DialogContent maxWidth="sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <DialogTitle>Enter PIN for {pendingPc.name}</DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" className="px-2 py-1 text-xs" aria-label="Close">
                  ✕
                </Button>
              </DialogClose>
            </div>

            <div className="space-y-3">
              <Input
                type="password"
                placeholder="PIN"
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                autoFocus
                className={pinError ? "border-red-400 focus:border-red-400" : ""}
              />
              {pinError && (
                <p className="text-xs text-red-500">Incorrect PIN. Try again.</p>
              )}
              <Button className="w-full" onClick={handlePinSubmit}>
                Access character
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
