"use client";

/**
 * /player/party — Read-only party overview.
 * Lists all PCs with avatar, class/level, and HP bar so a player can
 * quickly scan their companions' status between encounters.
 */

import { useAppStore } from "../../lib/store/appStore";
import { usePlayerSession } from "../../lib/store/usePlayerSession";
import { PlayerShell } from "../../components/PlayerShell";
import { Card, HpBar, ConditionChip, Pill, cn } from "../../components/ui";
import { ParticipantAvatar } from "../../components/ParticipantAvatar";

export default function PlayerPartyPage() {
  const { state } = useAppStore();
  const pcs = state.pcs;
  const { selectedPcId } = usePlayerSession();

  return (
    <PlayerShell>
      <h2 className="mb-4 text-xl font-bold text-foreground">The Party</h2>

      {pcs.length === 0 ? (
        <Card className="py-10 text-center text-sm text-muted">
          No characters yet. Ask your DM to add the party.
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {pcs.map((pc) => {
            const isMe = pc.id === selectedPcId;
            return (
              <li key={pc.id}>
                <Card
                  className={cn(
                    isMe && "border-accent/40 shadow-[0_0_0_1px_var(--accent)]"
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
                    className="mt-3 h-1.5"
                  />

                  {pc.conditions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {pc.conditions.map((c) => (
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
