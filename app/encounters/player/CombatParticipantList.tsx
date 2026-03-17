// app/encounters/player/CombatParticipantList.tsx
"use client";
import { useState, useCallback } from "react";
import { CombatParticipantRow } from "../../components/CombatParticipantRow";
import { useAppStore } from "../../lib/store/appStore";
import type { Encounter } from "../../lib/models/types";

interface Props {
  encounter: Encounter;
  pinnedInspectorId: string | null;
  onPin: (id: string | null) => void;
}

export function CombatParticipantList({ encounter, pinnedInspectorId, onPin }: Props) {
  const { dispatchEncounterEvent, updatePc, state } = useAppStore();
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // Collapse expanded row when clicking on empty list area (outside any row)
  const handleListClick = () => setExpandedRowId(null);

  const handlePin = useCallback((id: string) => {
    // Toggle: pin if not already pinned, unpin if same id
    onPin(pinnedInspectorId === id ? null : id);
  }, [pinnedInspectorId, onPin]);

  const handleDamage = useCallback((participantId: string, amount: number) => {
    dispatchEncounterEvent(encounter.id, { t: "DAMAGE_APPLIED", participantId, amount });
  }, [encounter.id, dispatchEncounterEvent]);

  const handleHeal = useCallback((participantId: string, amount: number) => {
    dispatchEncounterEvent(encounter.id, { t: "HEAL_APPLIED", participantId, amount });
  }, [encounter.id, dispatchEncounterEvent]);

  // "Active" = currentHp > 0; "Downed" = currentHp <= 0.
  // Design decision: PCs at 0 HP are DOWNED (not defeated) — they remain interactive
  // so the DM can apply healing, track death saves via avatar pin, etc.
  // Downed rows are NOT pointer-events-none.
  const active = [...encounter.participants]
    .filter((p) => (p.currentHp ?? 1) > 0)
    .sort((a, b) => {
      if (a.initiative === null && b.initiative === null) return a.name.localeCompare(b.name);
      if (a.initiative === null) return 1;
      if (b.initiative === null) return -1;
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      return a.name.localeCompare(b.name);
    });

  const downed = encounter.participants.filter((p) => (p.currentHp ?? 1) <= 0);

  return (
    // handleListClick collapses expanded row when user clicks empty list area
    <div className="overflow-y-auto flex flex-col gap-1 p-2" onClick={handleListClick}>
      <div
        className="text-[0.6rem] font-bold uppercase tracking-widest px-1 pt-1 pb-0.5"
        style={{ color: "var(--combat-fg-muted)" }}
      >
        Active Combatants
      </div>

      {active.map((p) => {
        const pc = p.kind === "pc" && p.refId ? state.pcs.find((x) => x.id === p.refId) : null;
        return (
          <CombatParticipantRow
            key={p.id}
            participant={p}
            isActive={p.id === encounter.activeParticipantId}
            isExpanded={expandedRowId === p.id}
            onExpand={(id) => setExpandedRowId(id)}
            onCollapse={() => setExpandedRowId(null)}
            onPin={handlePin}
            onDamage={handleDamage}
            onHeal={handleHeal}
            inspiration={pc?.inspiration}
            onToggleInspiration={pc ? () => updatePc(pc.id, { inspiration: !pc.inspiration }) : undefined}
          />
        );
      })}

      {downed.length > 0 && (
        <>
          <div
            className="text-[0.6rem] font-bold uppercase tracking-widest px-1 pt-3 pb-0.5 border-t mt-2"
            style={{ color: "var(--combat-fg-muted)", borderColor: "var(--combat-border)" }}
          >
            Downed
          </div>
          {/* Downed rows remain interactive — DM can heal them or pin to inspector for death saves */}
          {downed.map((p) => {
            const pc = p.kind === "pc" && p.refId ? state.pcs.find((x) => x.id === p.refId) : null;
            return (
              <div key={p.id} className="opacity-50">
                <CombatParticipantRow
                  participant={p}
                  isActive={false} isExpanded={expandedRowId === p.id}
                  onExpand={(id) => setExpandedRowId(id)}
                  onCollapse={() => setExpandedRowId(null)}
                  onPin={handlePin} onDamage={handleDamage} onHeal={handleHeal}
                  inspiration={pc?.inspiration}
                  onToggleInspiration={pc ? () => updatePc(pc.id, { inspiration: !pc.inspiration }) : undefined}
                />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
