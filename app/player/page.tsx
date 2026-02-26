"use client";

/**
 * /player — "Who are you?" selector.
 * Players pick their campaign (if more than one exists) and then their
 * character; selections are persisted in usePlayerSession.
 */

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "../lib/store/appStore";
import { usePlayerSession } from "../lib/store/usePlayerSession";
import { Card, SectionTitle, Button } from "../components/ui";
import { ParticipantAvatar } from "../components/ParticipantAvatar";

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

  function handleSelect(pcId: string) {
    selectPc(pcId);
    router.push("/player/character");
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
                {visiblePcs.map((pc) => (
                  <li key={pc.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(pc.id)}
                      className="w-full text-left"
                    >
                      <Card className="flex items-center gap-4 transition-shadow hover:shadow-xl active:scale-[0.98]">
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
                        <div className="shrink-0 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                          Play
                        </div>
                      </Card>
                    </button>
                  </li>
                ))}
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
    </div>
  );
}
