// app/components/CombatParticipantRow.tsx
"use client";
import { useRef, useEffect } from "react";
import { Zap, Brain } from "lucide-react";
import { cn, Input } from "./ui";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { ConditionChip } from "./ui";
import type { EncounterParticipant } from "../lib/models/types";

function hpColor(current: number | null, max: number | null): string {
  if (current === null || max === null || max === 0 || current <= 0) return "var(--hp-zero)";
  const pct = current / max;
  if (pct <= 0.25) return "var(--hp-low)";
  if (pct <= 0.5) return "var(--hp-mid)";
  return "var(--hp-full)";
}

interface Props {
  participant: EncounterParticipant;
  isActive: boolean;
  isExpanded: boolean;
  onExpand: (id: string) => void;   // row click (non-avatar area)
  onCollapse: () => void;
  onPin: (id: string) => void;      // avatar click — stopPropagation inside
  onDamage: (id: string, amount: number) => void;
  onHeal: (id: string, amount: number) => void;
  inspiration?: boolean;
  onToggleInspiration?: () => void;
  concentrating?: boolean;
  onToggleConcentration?: () => void;
  concentrationNudge?: boolean;
}

export function CombatParticipantRow({
  participant: p, isActive, isExpanded,
  onExpand, onCollapse, onPin, onDamage, onHeal,
  inspiration, onToggleInspiration,
  concentrating, onToggleConcentration, concentrationNudge,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isExpanded]);

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // critical: prevent row expansion
    onPin(p.id);
  };

  const handleRowClick = (e: React.MouseEvent) => {
    // stopPropagation prevents the list container's handleListClick from
    // immediately collapsing the row we just expanded.
    e.stopPropagation();
    if (!isExpanded) onExpand(p.id);
  };

  const commitDamage = () => {
    const amount = parseInt(inputRef.current?.value ?? "", 10);
    if (!isNaN(amount) && amount > 0) { onDamage(p.id, amount); onCollapse(); }
  };

  const commitHeal = () => {
    const amount = parseInt(inputRef.current?.value ?? "", 10);
    if (!isNaN(amount) && amount > 0) { onHeal(p.id, amount); onCollapse(); }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { onCollapse(); return; }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitDamage(); }
    else if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); commitHeal(); }
  };

  const color = hpColor(p.currentHp, p.maxHp);
  const hpPct = p.maxHp && p.maxHp > 0
    ? Math.max(0, Math.min(1, (p.currentHp ?? 0) / p.maxHp)) : 0;
  const visibleConditions = p.conditions.slice(0, 2);
  const overflow = p.conditions.length - 2;

  return (
    <div
      onClick={handleRowClick}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 rounded-lg border-l-[3px] cursor-pointer select-none transition-colors duration-200",
        isActive
          ? "border-l-[var(--combat-active-border)] bg-[var(--combat-active-row-bg)]"
          : "border-l-transparent hover:bg-[var(--combat-surface-raised)]"
      )}
    >
      {/* Avatar — click pins inspector. min-h/w-[44px] meets touch target minimum (WCAG 2.5.5). */}
      <div
        onClick={handleAvatarClick}
        className="shrink-0 cursor-pointer flex items-center justify-center min-h-[44px] min-w-[44px]"
      >
        <ParticipantAvatar
          name={p.name}
          visual={p.visual}
          size="sm"
          className={cn(isActive && "ring-2 ring-offset-1 ring-[var(--combat-active-avatar-ring)]")}
        />
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <div
          className="truncate text-sm font-semibold"
          style={{ color: isActive ? "var(--combat-active-name)" : "var(--combat-fg)" }}
        >
          {p.name}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[0.58rem] font-bold uppercase tracking-wide" style={{ color: "var(--combat-fg-muted)" }}>
            {p.kind}
          </span>
          {p.initiative !== null && (
            <span className="font-mono text-[0.68rem]" style={{ color: "var(--combat-fg-muted)" }}>
              init {p.initiative}
            </span>
          )}
          {visibleConditions.map((c) => (
            <ConditionChip key={c} label={c} />
          ))}
          {overflow > 0 && (
            <span className="text-[0.6rem]" style={{ color: "var(--combat-fg-muted)" }}>+{overflow}</span>
          )}
        </div>
      </div>

      {/* Concentration flag — shows when handler is provided */}
      {onToggleConcentration && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleConcentration(); }}
          className="-m-1.5 p-1.5 shrink-0 rounded transition-all duration-150 active:scale-95"
          style={{ opacity: concentrating ? 1 : 0.28 }}
          aria-label={`${concentrating ? "Remove" : "Mark"} concentration for ${p.name}`}
          title={concentrating ? "Remove concentration" : "Mark concentrating"}
        >
          <Brain
            size={13}
            style={{ color: concentrating ? "var(--combat-active-border)" : "var(--combat-fg-muted)" }}
          />
        </button>
      )}

      {/* Inspiration pip — PC only, shows when handler is provided */}
      {onToggleInspiration && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleInspiration(); }}
          className="-m-1.5 p-1.5 shrink-0 rounded transition-all duration-150 active:scale-95"
          style={{ opacity: inspiration ? 1 : 0.28 }}
          aria-label={`${inspiration ? "Remove" : "Grant"} inspiration for ${p.name}`}
          title={inspiration ? "Remove inspiration" : "Grant inspiration"}
        >
          <Zap
            size={13}
            style={{ color: inspiration ? "var(--combat-active-border)" : "var(--combat-fg-muted)" }}
          />
        </button>
      )}

      {/* COLLAPSED: stat cluster */}
      {!isExpanded && (
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[0.55rem] font-bold uppercase" style={{ color: "var(--combat-fg-muted)" }}>HP</span>
            <span className="font-mono text-sm font-bold" style={{ color }}>
              {p.currentHp ?? "—"}/{p.maxHp ?? "—"}
            </span>
          </div>
          {p.maxHp !== null && p.currentHp !== null && (
            <div className="w-12 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--combat-border)" }}>
              <div className="h-full rounded-full" style={{ width: `${hpPct * 100}%`, backgroundColor: color }} />
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[0.55rem] font-bold uppercase" style={{ color: "var(--combat-fg-muted)" }}>AC</span>
            <span className="font-mono text-sm font-bold" style={{ color: "var(--combat-fg)" }}>{p.ac ?? "—"}</span>
          </div>
        </div>
      )}

      {/* EXPANDED: inline damage input.
          Dmg/Heal buttons use raw <button> with --combat-* token colors — justified exception:
          the always-dark combat surface requires token-based colors not available in Button variants. */}
      {isExpanded && (
        <div
          className="flex items-center gap-2 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="0"
            onKeyDown={handleKeyDown}
            className="w-14 text-center font-mono font-bold text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            style={{
              backgroundColor: "var(--combat-surface-raised)",
              border: "1.5px solid var(--combat-active-border)",
              color: "var(--combat-fg)",
              WebkitTextFillColor: "var(--combat-fg)",
              caretColor: "var(--combat-fg)",
            }}
          />
          <button
            onClick={commitDamage}
            className="text-[0.68rem] font-bold px-2.5 py-1 rounded-md hover:opacity-80"
            style={{ backgroundColor: "var(--btn-damage-bg)", color: "var(--btn-damage-fg)" }}
            aria-label={`Apply damage to ${p.name}`}
          >
            Dmg
          </button>
          <button
            onClick={commitHeal}
            className="text-[0.68rem] font-bold px-2.5 py-1 rounded-md hover:opacity-80"
            style={{ backgroundColor: "var(--btn-heal-bg)", color: "var(--btn-heal-fg)" }}
            aria-label={`Heal ${p.name}`}
          >
            Heal
          </button>
        </div>
      )}
      {/* Concentration check nudge — flashes after damage is applied to a concentrating participant */}
      {concentrationNudge && (
        <div
          className="absolute inset-x-0 bottom-0 px-3 py-1 text-[0.65rem] font-bold text-center rounded-b-lg animate-[nudgePulse_300ms_ease-out_both]"
          style={{ backgroundColor: "var(--hp-low)", color: "#fff" }}
        >
          Concentration check!
        </div>
      )}
    </div>
  );
}
