"use client";
import { useState, useRef } from "react";
import { ConditionChip, ConditionPicker, Textarea, HpBar } from "../../components/ui";
import { ParticipantAvatar } from "../../components/ParticipantAvatar";
import { useAppStore } from "../../lib/store/appStore";
import { resolveParticipantSource } from "../../lib/engine/participantHelpers";
import { SRD_CONDITIONS } from "../../lib/data/srd";
import type { Encounter, Pc, Monster } from "../../lib/models/types";

interface Props {
  encounter: Encounter;
  pinnedId: string | null;
  onUnpin: () => void;
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="flex flex-col items-center rounded-md py-2"
      style={{ backgroundColor: "var(--combat-surface-raised)" }}
    >
      <span
        className="font-mono text-sm font-bold"
        style={{ color: "var(--combat-fg)" }}
      >
        {value}
      </span>
      <span
        className="text-[0.55rem] font-bold uppercase tracking-widest mt-0.5"
        style={{ color: "var(--combat-fg-muted)" }}
      >
        {label}
      </span>
    </div>
  );
}

function AbilityTile({ abbr, score }: { abbr: string; score: number }) {
  const mod = Math.floor((score - 10) / 2);
  return (
    <div
      className="flex flex-col items-center rounded-md py-1.5"
      style={{ backgroundColor: "var(--combat-surface-raised)" }}
    >
      <span
        className="font-mono text-sm font-bold"
        style={{ color: "var(--combat-fg)" }}
      >
        {score}
      </span>
      <span className="font-mono text-xs" style={{ color: "var(--combat-fg-muted)" }}>
        {mod >= 0 ? `+${mod}` : mod}
      </span>
      <span
        className="text-[0.5rem] font-bold uppercase tracking-widest"
        style={{ color: "var(--combat-fg-muted)" }}
      >
        {abbr}
      </span>
    </div>
  );
}

function HpControls({
  onDamage,
  onHeal,
}: {
  onDamage: (n: number) => void;
  onHeal: (n: number) => void;
}) {
  const [amount, setAmount] = useState("");
  const parsed = parseInt(amount, 10);
  const valid = !isNaN(parsed) && parsed > 0;
  const commit = (fn: (n: number) => void) => {
    if (valid) {
      fn(parsed);
      setAmount("");
    }
  };

  return (
    <div className="flex gap-2">
      <div
        className="flex-1 flex items-center gap-2 rounded-md px-3 py-1.5 border"
        style={{
          backgroundColor: "var(--combat-surface-raised)",
          borderColor: "var(--combat-border-raised)",
        }}
      >
        <span
          className="text-[0.6rem] font-bold uppercase tracking-widest shrink-0"
          style={{ color: "var(--combat-fg-muted)" }}
        >
          AMT
        </span>
        <input
          type="number"
          min={1}
          value={amount}
          placeholder="0"
          onChange={(e) => setAmount(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none font-mono font-bold text-sm text-center"
          style={{ color: "var(--combat-fg)" }}
        />
      </div>
      <button
        disabled={!valid}
        onClick={() => commit(onDamage)}
        className="text-xs font-bold px-3 py-1.5 rounded-md disabled:opacity-40"
        style={{
          backgroundColor: "var(--btn-damage-bg)",
          color: "var(--btn-damage-fg)",
        }}
      >
        Dmg
      </button>
      <button
        disabled={!valid}
        onClick={() => commit(onHeal)}
        className="text-xs font-bold px-3 py-1.5 rounded-md disabled:opacity-40"
        style={{
          backgroundColor: "var(--btn-heal-bg)",
          color: "var(--btn-heal-fg)",
        }}
      >
        Heal
      </button>
    </div>
  );
}

export function CombatInspector({ encounter, pinnedId, onUnpin }: Props) {
  const { dispatchEncounterEvent } = useAppStore();
  const pcs = useAppStore((s) => s.pcs);
  const monsters = useAppStore((s) => s.monsters);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const participantId = pinnedId ?? encounter.activeParticipantId;
  const p = encounter.participants.find((x) => x.id === participantId) ?? null;
  const isPinned = pinnedId !== null;
  const isActive = p?.id === encounter.activeParticipantId;

  const source = p ? resolveParticipantSource(p, pcs, monsters) : null;
  const pcSrc = source && p?.kind === "pc" ? (source as Pc) : null;
  const monSrc = source && p?.kind === "monster" ? (source as Monster) : null;

  function dispatch(event: Parameters<typeof dispatchEncounterEvent>[1]) {
    dispatchEncounterEvent(encounter.id, event);
  }

  function handleDamage(amount: number) {
    if (!p) return;
    dispatch({ t: "DAMAGE_APPLIED", participantId: p.id, amount });
  }

  function handleHeal(amount: number) {
    if (!p) return;
    dispatch({ t: "HEAL_APPLIED", participantId: p.id, amount });
  }

  function handleConditions(conditions: string[]) {
    if (!p) return;
    dispatch({ t: "CONDITIONS_SET", participantId: p.id, value: conditions });
  }

  function handleNotes(value: string) {
    if (!p) return;
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      dispatch({ t: "NOTES_SET", participantId: p.id, value });
    }, 500);
  }

  // toggleDeathSave: clicking an already-filled circle decrements it (toggle).
  // This allows the DM to correct accidental taps without needing global undo.
  function toggleDeathSave(type: "success" | "failure", index: number) {
    if (!p || p.kind !== "pc" || !p.refId) return;
    const cur = p.deathSaves ?? { successes: 0, failures: 0, stable: false };
    const field = type === "success" ? "successes" : "failures";
    const current = cur[field];
    // If clicking circle i: fill if i >= current (increment), clear if i < current (decrement)
    const next = index < current ? index : Math.min(3, index + 1);
    dispatch({
      t: "DEATH_SAVES_SET",
      participantId: p.id,
      pcId: p.refId,
      value: { ...cur, [field]: next },
    });
  }

  if (!p) {
    return (
      <div
        className="flex items-center justify-center h-full"
        style={{ backgroundColor: "var(--combat-surface)" }}
      >
        <p className="text-sm" style={{ color: "var(--combat-fg-muted)" }}>
          No active participant
        </p>
      </div>
    );
  }

  const showDeathSaves = p.kind === "pc" && (p.currentHp ?? 1) <= 0;

  // Quick stats: always AC, then source-dependent fields (max 6 tiles)
  // Pc.skills is a typed object with named numeric fields; Object.entries is valid here.
  const skillEntries = pcSrc
    ? (Object.entries(pcSrc.skills) as [string, number][])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([k, v]) => ({
          label: k.slice(0, 4).toUpperCase(),
          value: v >= 0 ? `+${v}` : String(v),
        }))
    : [];

  const quickStats: { label: string; value: string | number }[] = [
    { label: "AC", value: p.ac ?? "—" },
    ...(pcSrc
      ? [
          {
            label: "Init",
            value: `+${Math.floor((pcSrc.abilities.dex - 10) / 2)}`,
          },
          ...skillEntries,
        ]
      : monSrc
        ? [
            { label: "CR", value: monSrc.challenge ?? "—" },
            { label: "Speed", value: monSrc.speed ?? "—" },
          ]
        : []),
  ].slice(0, 6);

  const sectionStyle = { borderBottomColor: "var(--combat-border)" };
  const sectionLabelStyle = { color: "var(--combat-fg-muted)" };

  return (
    <div
      className="flex flex-col overflow-y-auto h-full"
      style={{ backgroundColor: "var(--combat-surface)" }}
    >
      {/* Sticky header */}
      <div
        className="sticky top-0 flex items-center gap-3 px-4 py-3 border-b z-10"
        style={{ backgroundColor: "var(--combat-surface)", ...sectionStyle }}
      >
        <ParticipantAvatar name={p.name} visual={p.visual} size="md" />
        <div className="min-w-0 flex-1">
          <div
            className="font-bold text-base truncate"
            style={{
              color: isActive ? "var(--combat-active-name)" : "var(--combat-fg)",
            }}
          >
            {p.name}
          </div>
          <div className="text-[0.68rem]" style={{ color: "var(--combat-fg-muted)" }}>
            {p.kind.toUpperCase()}
            {pcSrc && ` · ${pcSrc.className} ${pcSrc.level}`}
            {monSrc && ` · CR ${monSrc.challenge}`}
            {isActive && " · ✦ Active Turn"}
          </div>
        </div>
        {isPinned && (
          <button
            onClick={onUnpin}
            className="text-[0.65rem] font-bold px-2 py-1 rounded border shrink-0"
            style={{
              borderColor: "var(--combat-border-raised)",
              color: "var(--combat-fg-muted)",
            }}
            aria-label="Unpin participant"
          >
            📌 Pinned
          </button>
        )}
      </div>

      {/* HP */}
      <div className="px-4 py-3 border-b" style={sectionStyle}>
        <div
          className="text-[0.6rem] font-bold uppercase tracking-widest mb-2"
          style={sectionLabelStyle}
        >
          Hit Points
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span
            className="font-mono text-3xl font-extrabold"
            style={{ color: "var(--combat-fg)" }}
          >
            {p.currentHp ?? "—"}
          </span>
          <span style={{ color: "var(--combat-fg-muted)" }}>/</span>
          <span className="font-mono text-lg" style={{ color: "var(--combat-fg-muted)" }}>
            {p.maxHp ?? "—"}
          </span>
          {(p.tempHp ?? 0) > 0 && (
            <span
              className="text-xs"
              style={{ color: "var(--combat-active-border)" }}
            >
              +{p.tempHp} temp
            </span>
          )}
        </div>
        {/* HpBar owns HP-state color logic */}
        <HpBar current={p.currentHp ?? 0} max={p.maxHp ?? 0} className="h-1.5 mb-3" />
        <HpControls onDamage={handleDamage} onHeal={handleHeal} />
      </div>

      {/* Quick stats */}
      {quickStats.length > 0 && (
        <div className="px-4 py-3 border-b" style={sectionStyle}>
          <div
            className="text-[0.6rem] font-bold uppercase tracking-widest mb-2"
            style={sectionLabelStyle}
          >
            Stats
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {quickStats.map((s) => (
              <StatTile key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        </div>
      )}

      {/* Abilities */}
      {source?.abilities && (
        <div className="px-4 py-3 border-b" style={sectionStyle}>
          <div
            className="text-[0.6rem] font-bold uppercase tracking-widest mb-2"
            style={sectionLabelStyle}
          >
            Abilities
          </div>
          <div className="grid grid-cols-6 gap-1">
            {(["str", "dex", "con", "int", "wis", "cha"] as const).map((stat) => (
              <AbilityTile
                key={stat}
                abbr={stat.toUpperCase()}
                score={source.abilities[stat]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Conditions */}
      <div className="px-4 py-3 border-b" style={sectionStyle}>
        <div
          className="text-[0.6rem] font-bold uppercase tracking-widest mb-2"
          style={sectionLabelStyle}
        >
          Conditions
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {p.conditions.map((c) => (
            <ConditionChip
              key={c}
              label={c}
              onRemove={() => handleConditions(p.conditions.filter((x) => x !== c))}
            />
          ))}
        </div>
        <ConditionPicker
          active={p.conditions}
          conditions={SRD_CONDITIONS}
          onChange={handleConditions}
        />
      </div>

      {/* Notes */}
      <div className="px-4 py-3 border-b" style={sectionStyle}>
        <div
          className="text-[0.6rem] font-bold uppercase tracking-widest mb-2"
          style={sectionLabelStyle}
        >
          Notes
        </div>
        <Textarea
          defaultValue={p.notes ?? ""}
          placeholder="Notes for this turn…"
          onChange={(e) => handleNotes(e.target.value)}
          rows={3}
          className="text-sm w-full"
        />
      </div>

      {/* Death saves — visible only for PCs at 0 HP */}
      {showDeathSaves && (
        <div className="px-4 py-3">
          <div
            className="text-[0.6rem] font-bold uppercase tracking-widest mb-3"
            style={sectionLabelStyle}
          >
            Death Saves
          </div>
          {(["success", "failure"] as const).map((type) => {
            const count =
              type === "success"
                ? (p.deathSaves?.successes ?? 0)
                : (p.deathSaves?.failures ?? 0);
            const fillColor =
              type === "success" ? "var(--hp-full)" : "var(--hp-low)";
            return (
              <div key={type} className="flex items-center gap-2 mb-2">
                <span
                  className="text-xs w-16 capitalize"
                  style={{ color: "var(--combat-fg-muted)" }}
                >
                  {type}s
                </span>
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    onClick={() => toggleDeathSave(type, i)}
                    className="size-5 rounded-full border-2 transition-colors"
                    style={{
                      backgroundColor:
                        count > i ? fillColor : "transparent",
                      borderColor:
                        count > i ? fillColor : "var(--combat-border-raised)",
                    }}
                    aria-label={`${type} ${i + 1} — click to toggle`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
