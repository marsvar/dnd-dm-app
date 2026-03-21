"use client";

/**
 * /player/party — Read-only party overview.
 * Lists all PCs with avatar, class/level, and HP bar so a player can
 * quickly scan their companions' status between encounters.
 */

import { useMemo } from "react";
import { useAppStore } from "../../lib/store/appStore";
import { usePlayerSession } from "../../lib/store/usePlayerSession";
import { useCampaignPlayerView } from "../../lib/player/useCampaignPlayerView";
import { cueClass } from "../../lib/player/playerCue";
import { PlayerShell } from "../../components/PlayerShell";
import { Card, HpBar, ConditionChip, Pill, cn } from "../../components/ui";
import { ParticipantAvatar } from "../../components/ParticipantAvatar";

export default function PlayerPartyPage() {
  const { state } = useAppStore();
  const { selectedPcId, campaignId } = usePlayerSession();
  const { payload: snapshot, status, cues } = useCampaignPlayerView(campaignId);
  const statusMessage =
    !campaignId
      ? null
      : status === "loading" && !snapshot
        ? "Connecting to live updates…"
        : status === "stale"
          ? "Live updates may be outdated."
          : status === "paused"
            ? "Live updates paused."
            : null;

  const pcsById = useMemo(() => new Map(state.pcs.map((pc) => [pc.id, pc])), [state.pcs]);

  const statusBanner = statusMessage ? (
    <Card className="mb-4 border-amber-200 bg-amber-50 text-xs text-amber-700">
      {statusMessage}
    </Card>
  ) : null;

  const partyList = useMemo(() => {
    if (!snapshot?.party) return state.pcs;
    return snapshot.party.map((pc) => {
      const local = pcsById.get(pc.pc_id);
      return {
        id: pc.pc_id,
        name: pc.name,
        className: local?.className ?? pc.class_name,
        level: local?.level ?? pc.level,
        currentHp: pc.current_hp,
        maxHp: pc.max_hp,
        tempHp: pc.temp_hp,
        conditions: pc.conditions ?? [],
        visual: local?.visual,
        playerName: local?.playerName,
        race: local?.race,
        ac: local?.ac ?? 0,
        inspiration: local?.inspiration ?? false,
      };
    });
  }, [snapshot, pcsById, state.pcs]);

  return (
    <PlayerShell>
      {statusBanner}
      <h2 className="mb-4 text-xl font-bold text-foreground">The Party</h2>

      {partyList.length === 0 ? (
        <Card className="py-10 text-center text-sm text-muted">
          No characters yet. Ask your DM to add the party.
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {partyList.map((pc) => {
            const isMe = pc.id === selectedPcId;
            const cueActive = cues.partyPcIds.includes(pc.id);
            return (
              <li key={pc.id}>
                <Card
                  className={cn(
                    isMe && "border-accent/40 shadow-[0_0_0_1px_var(--accent)]",
                    cueClass(cueActive)
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ParticipantAvatar
                      name={pc.name}
                      visual={pc.visual}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-foreground">
                          {pc.name}
                        </p>
                        {isMe && (
                          <Pill label="You" tone="accent" className="text-[10px] px-2 py-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted">
                        {[pc.race, pc.className, pc.level ? `Lv${pc.level}` : ""]
                          .filter(Boolean)
                          .join(" · ")}
                        {pc.playerName && (
                          <span className="ml-2 text-muted/60">
                            ({pc.playerName})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold text-foreground">
                        {pc.currentHp}{" "}
                        <span className="font-normal text-muted">
                          / {pc.maxHp}
                        </span>
                      </p>
                      {pc.ac > 0 && (
                        <p className="text-xs text-muted">AC {pc.ac}</p>
                      )}
                    </div>
                  </div>

                  <HpBar
                    current={pc.currentHp}
                    max={pc.maxHp}
                    className={cn("mt-3 h-1.5", cueClass(cueActive))}
                  />

                  {pc.conditions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {pc.conditions.map((c: string) => (
                        <ConditionChip key={c} label={c} />
                      ))}
                    </div>
                  )}

                  {pc.inspiration && (
                    <p className="mt-1.5 text-xs font-semibold text-yellow-500">
                      ✦ Inspired
                    </p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </PlayerShell>
  );
}
