"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  Textarea,
} from "./ui";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { getChallengeXp } from "../lib/engine/selectors";
import type { Encounter, Monster } from "../lib/models/types";
import { useAppStore } from "../lib/store/appStore";

interface Props {
  encounter: Encounter;
  monstersById: Map<string, Monster>;
  open: boolean;
  onClose: () => void;
}

export const EncounterCompleteDialog = ({
  encounter,
  monstersById,
  open,
  onClose,
}: Props) => {
  const { addLogEntry } = useAppStore();
  const router = useRouter();
  const [note, setNote] = useState("");

  const defeatedMonsters = useMemo(
    () =>
      encounter.participants.filter(
        (p) => p.kind === "monster" && (p.currentHp ?? 1) <= 0
      ),
    [encounter.participants]
  );

  const totalXp = useMemo(
    () =>
      defeatedMonsters.reduce((sum, p) => {
        const monster = p.refId ? monstersById.get(p.refId) : undefined;
        const challenge = monster?.challenge;
        return sum + (challenge ? getChallengeXp(challenge) : 0);
      }, 0),
    [defeatedMonsters, monstersById]
  );

  const pcParticipants = useMemo(
    () => encounter.participants.filter((p) => p.kind === "pc"),
    [encounter.participants]
  );

  const xpPerPc =
    pcParticipants.length > 0 ? Math.floor(totalXp / pcParticipants.length) : 0;

  const hpColor = (current: number, max: number): string => {
    if (max <= 0 || current <= 0) return "var(--hp-zero)";
    const pct = current / max;
    if (pct <= 0.25) return "var(--hp-low)";
    if (pct <= 0.74) return "var(--hp-mid)";
    return "var(--hp-full)";
  };

  const handleDone = () => {
    if (note.trim()) {
      addLogEntry({
        text: note.trim(),
        source: "manual",
        ...(encounter.campaignId ? { campaignId: encounter.campaignId } : {}),
      });
    }
    setNote("");
    onClose();
  };

  const handleViewLog = () => {
    handleDone();
    router.push("/log");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent maxWidth="md">
        <div className="flex items-start justify-between gap-4 mb-1">
          <DialogTitle className="text-xl">
            {encounter.name} — Complete
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" className="shrink-0 -mt-1">✕ Close</Button>
          </DialogClose>
        </div>
        <p className="text-sm text-muted mb-4">
          {encounter.round} round{encounter.round !== 1 ? "s" : ""} ·{" "}
          {defeatedMonsters.length} defeated
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Rounds", value: encounter.round },
            { label: "Defeated", value: defeatedMonsters.length },
            { label: "Total XP", value: totalXp.toLocaleString() },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl bg-surface-strong p-3 text-center"
            >
              <p className="font-mono text-2xl font-semibold text-foreground">
                {value}
              </p>
              <p className="text-xs uppercase tracking-[0.15em] text-muted mt-1">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Party table */}
        {pcParticipants.length > 0 && (
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted mb-3">
              Party summary
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.12em] text-muted px-1">
                <span className="w-7 flex-shrink-0" />
                <span className="flex-1">Name</span>
                <span className="w-16 text-left">Final HP</span>
                <span className="w-16 text-right">XP</span>
              </div>
              {pcParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl bg-surface-strong px-3 py-2"
                >
                  <ParticipantAvatar participant={p} size="sm" />
                  <span className="flex-1 min-w-0 text-sm font-medium truncate">
                    {p.name}
                  </span>
                  <span
                    className="w-16 text-left font-mono text-sm font-semibold"
                    style={{ color: hpColor(p.currentHp ?? 0, p.maxHp ?? 0) }}
                  >
                    {p.currentHp} / {p.maxHp}
                  </span>
                  <span className="w-16 text-right font-mono text-sm font-semibold text-foreground">
                    +{xpPerPc} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Note */}
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted mb-2">
            Session note (optional)
          </p>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note about this encounter…"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleViewLog}>
            View log
          </Button>
          <Button onClick={handleDone}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
