"use client";

/**
 * /player/encounter — Live encounter view for a player.
 *
 * Shows:
 *  - Round + active turn banner
 *  - Initiative order with HP masked for non-PC participants
 *    (monsters/NPCs show a colour-coded Pill instead of numbers)
 *  - Player's own combatant card (HP, conditions, notes — read-only during live combat)
 *  - WeaponRollPanel: click-to-roll attack + damage for weapons on the Pc sheet
 *  - DeathSavePanel: interactive circles when currentHp ≤ 0
 *
 * Enemy HP masking is a presentational filter only — no event types were changed.
 */

import { useMemo, useState } from "react";
import { useAppStore } from "../../lib/store/appStore";
import { usePlayerSession } from "../../lib/store/usePlayerSession";
import { PlayerShell } from "../../components/PlayerShell";
import { Card, HpBar, ConditionChip, Pill, cn } from "../../components/ui";
import { ParticipantAvatar } from "../../components/ParticipantAvatar";
import type { DeathSaves, EncounterParticipant, Weapon } from "../../lib/models/types";
import { formatMod, getWeaponDiceFormula } from "../../lib/engine/pcEngine";
import { Shield, Swords } from "lucide-react";

// ------------------------------------------------------------------
// Dice helpers
// ------------------------------------------------------------------

function rollDice(formula: string): number[] {
  const m = formula.match(/^(\d+)d(\d+)$/i);
  if (!m) return [0];
  const count = Number(m[1]);
  const sides = Number(m[2]);
  return Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
}

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

  // Canonical Pc record — source of weapon and spellcasting data
  const myPc = useMemo(
    () => state.pcs.find((p) => p.id === selectedPcId) ?? null,
    [state.pcs, selectedPcId]
  );

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

  const atZeroHp = myParticipant !== null && (myParticipant.currentHp ?? 1) <= 0;

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

          {/* Death save tracker — visible when at 0 HP */}
          {atZeroHp && (
            <DeathSavePanel
              deathSaves={
                myParticipant.deathSaves ?? { successes: 0, failures: 0, stable: false }
              }
              onSave={(ds) => {
                if (!selectedPcId) return;
                dispatchEncounterEvent(encounter.id, {
                  t: "DEATH_SAVES_SET",
                  participantId: myParticipant.id,
                  pcId: selectedPcId,
                  value: ds,
                });
              }}
            />
          )}

          {/* Weapon roll panel — only shown when PC has weapons */}
          {myPc && myPc.weapons.length > 0 && (
            <WeaponRollPanel
              weapons={myPc.weapons}
              onRoll={(atkRolls, atkTotal, dmgRolls, dmgTotal, weapon) => {
                // Attack roll
                dispatchEncounterEvent(encounter.id, {
                  t: "ROLL_RECORDED",
                  mode: "digital",
                  context: `${weapon.name} attack`,
                  formula: `1d20+${weapon.attackBonus}`,
                  rawRolls: atkRolls,
                  total: atkTotal,
                });
                // Damage roll
                const dmgFormula =
                  weapon.damageBonus !== 0
                    ? `${weapon.damageDice}${weapon.damageBonus > 0 ? "+" : ""}${weapon.damageBonus}`
                    : weapon.damageDice;
                dispatchEncounterEvent(encounter.id, {
                  t: "ROLL_RECORDED",
                  mode: "digital",
                  context: `${weapon.name} damage`,
                  formula: dmgFormula,
                  rawRolls: dmgRolls,
                  total: dmgTotal,
                });
              }}
            />
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
    </PlayerShell>
  );
}

// ---------------------------------------------------------------------------
// Death save panel
// ---------------------------------------------------------------------------
function DeathSavePanel({
  deathSaves,
  onSave,
}: {
  deathSaves: DeathSaves;
  onSave: (ds: DeathSaves) => void;
}) {
  const { successes, failures, stable } = deathSaves;

  if (stable || successes >= 3) {
    return (
      <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-center text-sm font-semibold text-green-700">
        ✓ Stable
      </div>
    );
  }
  if (failures >= 3) {
    return (
      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-700">
        ✗ Death
      </div>
    );
  }

  /** Click circle i: fills up to i if empty, or clears from i onward if already filled. */
  const handleCircle = (type: "success" | "failure", i: number) => {
    const current = type === "success" ? successes : failures;
    const next = Math.max(0, Math.min(3, i < current ? i : i + 1));
    if (type === "success") {
      onSave({ successes: next, failures, stable: next >= 3 });
    } else {
      onSave({ successes, failures: next, stable });
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-black/10 bg-surface-strong px-3 py-2">
      <p className="mb-2 text-center text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
        Death Saves
      </p>
      <div className="flex items-center justify-center gap-6">
        {/* Successes */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[0.65rem] font-semibold uppercase text-green-600">Success</span>
          <div className="flex gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleCircle("success", i)}
                className={cn(
                  "h-5 w-5 rounded-full border-2 transition-colors",
                  i < successes
                    ? "border-green-500 bg-green-500"
                    : "border-black/20 bg-transparent hover:border-green-400"
                )}
                aria-label={`Death save success ${i + 1}`}
              />
            ))}
          </div>
        </div>
        {/* Failures */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[0.65rem] font-semibold uppercase text-red-500">Failure</span>
          <div className="flex gap-2">
            {Array.from({ length: 3 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleCircle("failure", i)}
                className={cn(
                  "h-5 w-5 rounded-full border-2 transition-colors",
                  i < failures
                    ? "border-red-500 bg-red-500"
                    : "border-black/20 bg-transparent hover:border-red-400"
                )}
                aria-label={`Death save failure ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weapon roll panel
// ---------------------------------------------------------------------------
type LastRoll = {
  weaponId: string;
  atkRolls: number[];
  atkTotal: number;
  dmgRolls: number[];
  dmgTotal: number;
};

function WeaponRollPanel({
  weapons,
  onRoll,
}: {
  weapons: Weapon[];
  onRoll: (
    atkRolls: number[],
    atkTotal: number,
    dmgRolls: number[],
    dmgTotal: number,
    weapon: Weapon
  ) => void;
}) {
  const [lastRoll, setLastRoll] = useState<LastRoll | null>(null);

  const handleRoll = (weapon: Weapon) => {
    const d20 = Math.floor(Math.random() * 20) + 1;
    const atkTotal = d20 + weapon.attackBonus;
    const dmgRolls = rollDice(weapon.damageDice);
    const dmgTotal = dmgRolls.reduce((a, b) => a + b, 0) + weapon.damageBonus;

    setLastRoll({ weaponId: weapon.id, atkRolls: [d20], atkTotal, dmgRolls, dmgTotal });
    onRoll([d20], atkTotal, dmgRolls, dmgTotal, weapon);
  };

  return (
    <div className="mt-3 border-t border-black/10 pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <Swords size={12} className="mr-1 inline" />
        Weapons
      </p>
      <div className="flex flex-col gap-2">
        {weapons.map((weapon) => {
          const isLast = lastRoll?.weaponId === weapon.id;
          const atkMod = formatMod(weapon.attackBonus);
          const dmgFormula = getWeaponDiceFormula(weapon);

          return (
            <div
              key={weapon.id}
              className="rounded-xl border border-black/10 bg-surface p-2"
            >
              {/* Row: name · badges · roll button */}
              <div className="flex items-center gap-2">
                <span className="flex-1 truncate text-sm font-semibold text-foreground">
                  {weapon.name}
                </span>
                <span className="rounded bg-surface-strong px-1.5 py-0.5 text-xs font-mono text-muted">
                  {atkMod} hit
                </span>
                <span className="rounded bg-surface-strong px-1.5 py-0.5 text-xs font-mono text-muted">
                  {dmgFormula}
                </span>
                <button
                  type="button"
                  onClick={() => handleRoll(weapon)}
                  className="shrink-0 rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-surface transition hover:opacity-90 active:scale-95"
                >
                  Roll
                </button>
              </div>

              {/* Last roll result */}
              {isLast && lastRoll && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg bg-accent/10 px-2 py-1 text-xs">
                  <span className="font-semibold text-accent">
                    Hit: {lastRoll.atkTotal}
                  </span>
                  <span className="text-muted">
                    (d20={lastRoll.atkRolls[0]}
                    {weapon.attackBonus !== 0
                      ? (weapon.attackBonus > 0 ? `+${weapon.attackBonus}` : `${weapon.attackBonus}`)
                      : ""})
                  </span>
                  <span className="text-muted">·</span>
                  <span className="font-semibold text-foreground">
                    Dmg: {lastRoll.dmgTotal}
                  </span>
                  <span className="text-muted">
                    ({lastRoll.dmgRolls.join("+")}
                    {weapon.damageBonus !== 0
                      ? weapon.damageBonus > 0
                        ? `+${weapon.damageBonus}`
                        : `${weapon.damageBonus}`
                      : ""}
                    )
                  </span>
                </div>
              )}

              {/* Physical dice reference */}
              <p className="mt-1 text-[0.65rem] text-muted/70">
                Physical: d20{weapon.attackBonus !== 0 ? formatMod(weapon.attackBonus) : ""} to hit
                {" · "}
                {dmgFormula}
                {weapon.range ? ` · ${weapon.range}` : ""}
              </p>
            </div>
          );
        })}
      </div>
    </div>
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
