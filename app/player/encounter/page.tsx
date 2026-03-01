"use client";

/**
 * /player/encounter — Live encounter view for a player.
 *
 * Shows:
 *  - Round + active turn banner
 *  - Initiative order with HP masked for non-PC participants
 *    (monsters/NPCs show a colour-coded Pill instead of numbers)
 *  - Player's own combatant card (HP, conditions, notes — read-only during live combat)
 *
 * Enemy HP masking is a presentational filter only — no event types were changed.
 */

import { useMemo, useState } from "react";
import { useAppStore } from "../../lib/store/appStore";
import { usePlayerSession } from "../../lib/store/usePlayerSession";
import { PlayerShell } from "../../components/PlayerShell";
import { Button, Card, HpBar, ConditionChip, Input, Pill, cn } from "../../components/ui";
import { ParticipantAvatar } from "../../components/ParticipantAvatar";
import type { EncounterParticipant } from "../../lib/models/types";
import { Dices, Shield, Swords } from "lucide-react";

// ------------------------------------------------------------------
// HP masking helper — returns a tone + label for enemy/NPC combatants
// ------------------------------------------------------------------
function hpTier(
  current: number | null,
  max: number | null
): { label: string; tone: "accent" | "neutral" } {
  if (current === null || max === null || max <= 0)
    return { label: "Unknown", tone: "neutral" };
  if (current <= 0) return { label: "Down", tone: "accent" };
  const pct = current / max;
  if (pct <= 0.25) return { label: "Critical", tone: "accent" };
  if (pct <= 0.5) return { label: "Bloodied", tone: "neutral" };
  return { label: "Healthy", tone: "neutral" };
}

export default function PlayerEncounterPage() {
  const { selectedPcId, campaignId } = usePlayerSession();
  const { state, dispatchEncounterEvent } = useAppStore();
  const encounters = state.encounters;

  // Find the running encounter scoped to the player's campaign (if set),
  // or fall back to any running encounter for backwards-compatibility.
  const encounter = useMemo(() => {
    if (campaignId) {
      return encounters.find((e) => e.campaignId === campaignId && e.isRunning) ?? null;
    }
    return encounters.find((e) => e.isRunning) ?? null;
  }, [encounters, campaignId]);

  // Resolve player's own participant (match by refId → selectedPcId)
  const myParticipant = useMemo(() => {
    if (!encounter || !selectedPcId) return null;
    return (
      encounter.participants.find(
        (p) => p.kind === "pc" && p.refId === selectedPcId
      ) ?? null
    );
  }, [encounter, selectedPcId]);

  // Sorted initiative order
  const sorted = useMemo(() => {
    if (!encounter) return [];
    return [...encounter.participants].sort((a, b) => {
      if (a.initiative === null) return 1;
      if (b.initiative === null) return -1;
      return b.initiative - a.initiative;
    });
  }, [encounter]);

  // Resolve active participant name
  const activeName = useMemo(() => {
    if (!encounter?.activeParticipantId) return null;
    return (
      encounter.participants.find(
        (p) => p.id === encounter.activeParticipantId
      )?.name ?? null
    );
  }, [encounter]);

  if (!encounter) {
    return (
      <PlayerShell>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Swords size={40} className="mb-4 text-muted" strokeWidth={1.2} />
          <p className="text-lg font-semibold text-foreground">No active encounter</p>
          <p className="mt-1 text-sm text-muted">
            Your DM hasn&apos;t started combat yet. Stand by.
          </p>
        </div>
      </PlayerShell>
    );
  }

  const isMyTurn =
    encounter.activeParticipantId !== null &&
    myParticipant?.id === encounter.activeParticipantId;

  return (
    <PlayerShell>
      {/* Round / turn banner */}
      <Card
        className={cn(
          "mb-4 text-center transition-all",
          isMyTurn && "border-accent shadow-[0_0_0_2px_var(--accent)]"
        )}
      >
        <p className="text-xs uppercase tracking-[0.3em] text-muted">
          Round {encounter.round}
        </p>
        {activeName ? (
          <p
            className={cn(
              "mt-1 text-lg font-bold",
              isMyTurn ? "text-accent" : "text-foreground"
            )}
          >
            {isMyTurn ? "⚔ Your turn!" : `${activeName}'s turn`}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">Waiting for initiative…</p>
        )}
      </Card>

      {/* My combatant card */}
      {myParticipant && (
        <Card className="mb-4 border-accent/30">
          <div className="mb-2 flex items-center gap-3">
            <Shield size={16} className="text-accent" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              You
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ParticipantAvatar
              name={myParticipant.name}
              visual={myParticipant.visual}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">{myParticipant.name}</p>
              <p className="text-sm text-muted">
                HP {myParticipant.currentHp ?? "—"} / {myParticipant.maxHp ?? "—"}
                {myParticipant.tempHp ? (
                  <span className="ml-1 text-cyan-400">
                    +{myParticipant.tempHp}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Initiative</p>
              <p className="font-bold text-foreground">
                {myParticipant.initiative ?? "—"}
              </p>
            </div>
          </div>
          <HpBar
            current={myParticipant.currentHp ?? 0}
            max={myParticipant.maxHp ?? 1}
            className="mt-3 h-2"
          />
          {myParticipant.conditions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {myParticipant.conditions.map((c) => (
                <ConditionChip key={c} label={c} />
              ))}
            </div>
          )}
          {myParticipant.notes && (
            <p className="mt-2 text-xs text-muted">{myParticipant.notes}</p>
          )}
        </Card>
      )}

      {/* Initiative order */}
      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted">
        Initiative Order
      </p>
      <ul className="flex flex-col gap-2">
        {sorted.map((p) => {
          const isMine = p.id === myParticipant?.id;
          const isActive = p.id === encounter.activeParticipantId;
          return (
            <InitiativeRow
              key={p.id}
              participant={p}
              isMine={isMine}
              isActive={isActive}
            />
          );
        })}
      </ul>

      {/* Player roll section */}
      {selectedPcId && (
        <RollSection
          encounterId={encounter.id}
          actorId={selectedPcId}
          onDispatch={dispatchEncounterEvent}
        />
      )}
    </PlayerShell>
  );
}

// ---------------------------------------------------------------------------
// Initiative row
// ---------------------------------------------------------------------------
function InitiativeRow({
  participant: p,
  isMine,
  isActive,
}: {
  participant: EncounterParticipant;
  isMine: boolean;
  isActive: boolean;
}) {
  const showHp = p.kind === "pc";
  const tier = hpTier(p.currentHp, p.maxHp);

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all",
        isActive
          ? "border-accent bg-accent/5"
          : "border-black/10 bg-surface",
        isMine && !isActive && "border-accent/30"
      )}
    >
      {/* Initiative bubble */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
          isActive
            ? "border-accent bg-accent text-white"
            : "border-black/10 bg-surface-strong text-muted"
        )}
      >
        {p.initiative ?? "—"}
      </div>

      <ParticipantAvatar name={p.name} visual={p.visual} size="sm" />

      {/* Name */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            isActive ? "text-accent" : "text-foreground"
          )}
        >
          {p.name}
          {isMine && (
            <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>
          )}
        </p>
        {p.conditions.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {p.conditions.map((c) => (
              <span
                key={c}
                className="rounded-full px-1.5 py-0 text-[10px] font-semibold"
                style={{
                  backgroundColor: "var(--condition-bg)",
                  color: "var(--condition-fg)",
                }}
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* HP display — full for PCs, masked for enemies */}
      <div className="shrink-0 text-right">
        {showHp ? (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs font-semibold text-foreground">
              {p.currentHp ?? "—"} / {p.maxHp ?? "—"}
            </span>
            <HpBar
              current={p.currentHp ?? 0}
              max={p.maxHp ?? 1}
              className="w-16"
            />
          </div>
        ) : (
          <Pill
            label={tier.label}
            tone={tier.tone}
            className={cn(
              tier.label === "Down" && "bg-red-100 text-red-600",
              tier.label === "Critical" && "bg-orange-100 text-orange-600",
              tier.label === "Bloodied" && "bg-yellow-100 text-yellow-700",
              tier.label === "Healthy" && "bg-green-100 text-green-700"
            )}
          />
        )}
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Roll section — player records a roll into the encounter event log
// ---------------------------------------------------------------------------
function RollSection({
  encounterId,
  actorId,
  onDispatch,
}: {
  encounterId: string;
  actorId: string;
  onDispatch: (encounterId: string, event: { t: "ROLL_RECORDED"; actorId?: string; mode: "digital" | "manual"; context: string; formula: string; rawRolls: number[]; total: number }) => void;
}) {
  const [context, setContext] = useState("");
  const [mode, setMode] = useState<"digital" | "manual">("digital");
  const [manualValue, setManualValue] = useState("");
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState(false);

  function rollD20() {
    const result = Math.floor(Math.random() * 20) + 1;
    setLastRoll(result);
    setPendingConfirm(true);
  }

  function confirmRoll(total: number, rawMode: "digital" | "manual") {
    onDispatch(encounterId, {
      t: "ROLL_RECORDED",
      actorId,
      mode: rawMode,
      context: context.trim() || "Roll",
      formula: "1d20",
      rawRolls: [total],
      total,
    });
    setContext("");
    setManualValue("");
    setLastRoll(null);
    setPendingConfirm(false);
  }

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center gap-2">
        <Dices size={14} className="text-muted" />
        <p className="text-xs uppercase tracking-[0.25em] text-muted">Your rolls</p>
      </div>
      <Card className="space-y-3">
        {/* Context label */}
        <Input
          placeholder="What are you rolling? (optional)"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode("digital"); setLastRoll(null); setPendingConfirm(false); }}
            className={cn(
              "flex-1 rounded-full border py-1.5 text-xs font-semibold transition",
              mode === "digital"
                ? "border-accent bg-accent/10 text-accent"
                : "border-black/10 text-muted hover:border-accent/50"
            )}
          >
            Roll d20 for me
          </button>
          <button
            type="button"
            onClick={() => { setMode("manual"); setLastRoll(null); setPendingConfirm(false); }}
            className={cn(
              "flex-1 rounded-full border py-1.5 text-xs font-semibold transition",
              mode === "manual"
                ? "border-accent bg-accent/10 text-accent"
                : "border-black/10 text-muted hover:border-accent/50"
            )}
          >
            Enter result
          </button>
        </div>

        {/* Digital mode */}
        {mode === "digital" && (
          <div className="space-y-2">
            {pendingConfirm && lastRoll !== null ? (
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-accent bg-accent/10">
                  <span className="font-mono text-2xl font-bold text-accent">{lastRoll}</span>
                </div>
                <div className="flex flex-1 gap-2">
                  <Button className="flex-1 text-xs" onClick={() => confirmRoll(lastRoll, "digital")}>
                    Record
                  </Button>
                  <Button variant="ghost" className="text-xs" onClick={() => { setLastRoll(null); setPendingConfirm(false); }}>
                    Reroll
                  </Button>
                </div>
              </div>
            ) : (
              <Button className="w-full" onClick={rollD20}>
                Roll d20
              </Button>
            )}
          </div>
        )}

        {/* Manual mode */}
        {mode === "manual" && (
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              max={30}
              placeholder="Result"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const v = Number(manualValue);
                  if (v > 0) confirmRoll(v, "manual");
                }
              }}
              className="flex-1"
            />
            <Button
              className="shrink-0"
              onClick={() => {
                const v = Number(manualValue);
                if (v > 0) confirmRoll(v, "manual");
              }}
            >
              Record
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
